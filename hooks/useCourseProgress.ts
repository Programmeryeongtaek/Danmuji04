'use client';

import { useToast } from '@/components/common/Toast/Context';
import { useCallback, useEffect, useState } from 'react';
import useSupabase from './useSupabase';
import { CourseItem } from '@/app/types/course/courseTypes';

interface CourseProgress {
  user_id: string;
  course_id: string;
  item_id: string;
  completed: boolean;
  last_accessed: string;
}

export function useCourseProgress(courseId: string) {
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasWriting, setHasWriting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const { supabase, user } = useSupabase();

  // 진행 상황 로드
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !courseId) {
        setCompletedItems([]);
        setIsCompleted(false);
        setHasWriting(false);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);

        // 1. 완료된 아이템 목록 조회
        const { data: progressData, error } = await supabase
          .from('course_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId);
          
        if (error) throw error;
          
        const completedItemIds = (progressData || [])
          .filter((item: CourseProgress) => item.completed)
          .map((item: CourseProgress) => item.item_id);
        
        setCompletedItems(completedItemIds);
        setIsCompleted(completedItemIds.length > 0);
        
        // 2. 글쓰기 완료 여부 확인
        const { data: writing, error: writingError } = await supabase
          .from('course_writings')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();
          
        if (writingError) throw writingError;
        setHasWriting(!!writing);
        
      } catch (error) {
        console.error('코스 진행 상황 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [courseId, supabase, user]);

  // 아이템 완료 처리
  const markComplete = useCallback(async (itemId: string) => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      return false;
    }
    
    try {
      // 이미 완료된 항목이면 스킵
      if (completedItems.includes(itemId)) {
        return true;
      }

      // DB에 완료 상태 저장
      const { error } = await supabase
        .from('course_progress')
        .upsert({
          user_id: user.id,
          course_id: courseId,
          item_id: itemId,
          completed: true,
          last_accessed: new Date().toISOString()
        }, {
          onConflict: 'user_id,course_id,item_id'
        });

      if (error) throw error;
        
      // 상태 업데이트
      setCompletedItems(prev => [...prev, itemId]);
      setIsCompleted(true);
      return true;
    } catch (error) {
      console.error('아이템 완료 처리 실패:', error);
      showToast('아이템 완료 처리에 실패했습니다.', 'error');
      return false;
    }
  }, [courseId, completedItems, showToast, supabase, user]);

  // 전체 코스 완료 처리
  const completeAllItems = useCallback(async () => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      return false;
    }
    
    try {
      // 코스 상세 정보를 불러와서 모든 아이템 ID 가져오기
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          course_items:course_items(id)
        `)
        .eq('id', courseId)
        .single();
        
      if (courseError) throw courseError;
      
      // 모든 아이템 ID 추출 - 타입 명시
      const allItemIds: string[] = (courseData.course_items || []).map((item: CourseItem) => item.id);
      
      // 모든 아이템 한번에 완료 처리
      const completionData = allItemIds.map((itemId: string) => ({
        user_id: user.id,
        course_id: courseId,
        item_id: itemId,
        completed: true,
        last_accessed: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('course_progress')
        .upsert(completionData, {
          onConflict: 'user_id,course_id,item_id'
        });
        
      if (error) throw error;

      showToast('코스 학습이 완료되었습니다!', 'success');
      setCompletedItems(allItemIds);
      setIsCompleted(true);
      return true;
    } catch (error) {
      console.error('코스 완료 처리 실패:', error);
      showToast('코스 완료 처리에 실패했습니다.', 'error');
      return false;
    }
  }, [courseId, showToast, supabase, user]);

  // 글쓰기 완료 처리
  const completeWriting = useCallback(async (content: string) => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      return false;
    }
    
    try {
      // 사용자 프로필 정보 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      const userName = profile?.nickname || profile?.name || '익명';
      
      // 이미 작성한 글이 있는지 확인
      const { data: existingWriting, error: checkError } = await supabase
        .from('course_writings')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingWriting) {
        // 기존 글 업데이트
        const { error } = await supabase
          .from('course_writings')
          .update({
            content,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingWriting.id);
          
        if (error) throw error;
      } else {
        // 새 글 작성
        const { error } = await supabase
          .from('course_writings')
          .insert({
            user_id: user.id,
            user_name: userName,
            course_id: courseId,
            item_id: 'default', // 일반적인 글쓰기
            content,
            is_public: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (error) throw error;
      }

      setHasWriting(true);
      showToast('글쓰기가 저장되었습니다!', 'success');
      return true;
    } catch (error) {
      console.error('글쓰기 완료 처리 실패:', error);
      showToast('글쓰기 저장에 실패했습니다.', 'error');
      return false;
    }
  }, [courseId, showToast, supabase, user]);

  return {
    completedItems,
    isCompleted,
    hasWriting,
    isLoading,
    markComplete,
    completeAllItems,
    completeWriting
  };
}