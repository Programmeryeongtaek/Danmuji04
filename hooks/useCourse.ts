'use client';

import { CourseProgress, CourseWithSections } from '@/app/types/course/courseModel';
import { Course } from '@/app/types/course/courseTypes';
import { useCallback, useEffect, useState } from 'react';
import useSupabase from './useSupabase';
import { useToast } from '@/components/common/Toast/Context';
import { SupabaseClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/utils/supabase/auth';

// Database 타입 정의 (간소화된 버전)
interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
  };
}

//TODO: 후에 분리할 것
const fetchCoursesByCategory = async (supabase: SupabaseClient<Database>, category: string): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Course[];
};

const fetchCourses = async (supabase: SupabaseClient<Database>): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Course[];
};

const fetchCourseDetail = async (supabase: SupabaseClient<Database>, courseId: string): Promise<CourseWithSections> => {
  // 코스 기본 정보 조회
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
  
  if (courseError) throw courseError;
  
  // 코스 아이템 조회
  const { data: items, error: itemsError } = await supabase
    .from('course_items')
    .select('*')
    .eq('course_id', courseId)
    .order('order_num', { ascending: true });
  
  if (itemsError) throw itemsError;
  
  // 결과 조합
  return {
    ...course,
    sections: [
      {
        id: 'main-section',
        title: '강의 목록',
        items: items || []
      }
    ]
  } as CourseWithSections;
};

const getUserCourseProgress = async (supabase: SupabaseClient<Database>, courseId: string, userId: string): Promise<CourseProgress[]> => {
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId);
  
  if (error) throw error;
  return data || [];
};

const markItemAsCompleted = async (supabase: SupabaseClient<Database>, courseId: string, itemId: string, userId: string): Promise<boolean> => {
  if (!userId) return false;
  
  // 이미 진행 상태가 있는지 확인
  const { data: existingProgress } = await supabase
    .from('course_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('item_id', itemId)
    .maybeSingle();
  
  const now = new Date().toISOString();
  
  if (existingProgress) {
    // 기존 진행 상태 업데이트
    const { error } = await supabase
      .from('course_progress')
      .update({
        completed: true,
        last_accessed: now
      })
      .eq('id', existingProgress.id);
    
    if (error) throw error;
  } else {
    // 새 진행 상태 생성
    const { error } = await supabase
      .from('course_progress')
      .insert({
        user_id: userId,
        course_id: courseId,
        item_id: itemId,
        completed: true,
        last_accessed: now
      });
    
    if (error) throw error;
  }
  
  return true;
};

const getUserWritingStatus = async (supabase: SupabaseClient<Database>, courseId: string, userId: string): Promise<boolean> => {
  if (!userId) return false;
  
  const { data, error } = await supabase
    .from('course_writings')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  
  if (error) throw error;
  return !!data;
};

const markCourseCompleted = async (supabase: SupabaseClient<Database>, courseId: string, userId: string): Promise<boolean> => {
  if (!userId) return false;
  
  // 코스의 모든 아이템 가져오기
  const courseData = await fetchCourseDetail(supabase, courseId);
  
  // sections가 undefined일 수 있으므로 체크
  if (!courseData.sections) {
    console.warn('코스에 섹션이 없습니다:', courseId);
    return false;
  }
  
  const allItemIds = courseData.sections.flatMap(section => 
    section.items.map(item => item.id)
  );
  
  // 각 아이템 완료 처리
  for (const itemId of allItemIds) {
    await markItemAsCompleted(supabase, courseId, itemId, userId);
  }
  
  return true;
};

const markWritingCompleted = async (supabase: SupabaseClient<Database>, courseId: string, content: string, userId: string): Promise<boolean> => {
  if (!userId) return false;
  
  // 사용자 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, nickname')
    .eq('id', userId)
    .single();
  
  if (!profile) throw new Error('프로필 정보를 찾을 수 없습니다.');
  
  const userName = profile.nickname || profile.name || '익명';
  
  // 이미 작성한 글이 있는지 확인
  const { data: existingWriting } = await supabase
    .from('course_writings')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  
  if (existingWriting) {
    // 기존 글 업데이트
    const { error } = await supabase
      .from('course_writings')
      .update({
        content: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingWriting.id);
    
    if (error) throw error;
  } else {
    // 새 글 작성
    const { error } = await supabase
      .from('course_writings')
      .insert({
        user_id: userId,
        user_name: userName,
        course_id: courseId,
        item_id: 'default', // 일반적인 글쓰기 (특정 아이템과 연결되지 않음)
        content: content,
        is_public: false
      });
    
    if (error) throw error;
  }
  
  return true;
};

// 코스 목록 조회를 위한 훅
export function useCourseList(category?: string) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const { supabase } = useSupabase();

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setIsLoading(true);
        let data: Course[];

        if (category) {
          data = await fetchCoursesByCategory(supabase, category);
        } else {
          data = await fetchCourses(supabase);
        }

        setCourses(data);
      } catch (error) {
        console.error('코스 목록 로드 실패:', error);
        showToast('코스 목록을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourses();
  }, [category, showToast, supabase]);

  return { courses, isLoading };
}

// 코스 상세 정보 조회를 위한 훅
export function useCourseDetail(courseId: string) {
  const [course, setCourse] = useState<CourseWithSections | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const { supabase } = useSupabase();

  useEffect(() => {
    const loadCourseDetail = async () => {
      try {
        setIsLoading(true);
        const data = await fetchCourseDetail(supabase, courseId);
        setCourse(data);
      } catch (error) {
        console.error('코스 상세 정보 로드 실패:', error);
        showToast('코스 상세 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourseDetail();
  }, [courseId, showToast, supabase]);

  return { course, isLoading };
}

// 코스 진행 상황 관리를 위한 훅
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
        const progressData = await getUserCourseProgress(supabase, courseId, user.id);
        const completedItemIds = progressData
          .filter((item: CourseProgress) => item.completed)
          .map((item: CourseProgress) => item.item_id);
        
        setCompletedItems(completedItemIds);

        // 2. 코스가 완료되었는지 확인 (하나 이상의 아이템이 완료됨)
        setIsCompleted(completedItemIds.length > 0);
        
        // 3. 글쓰기 완료 여부 확인
        const writingStatus = await getUserWritingStatus(supabase, courseId, user.id);
        setHasWriting(writingStatus);
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
      const success = await markItemAsCompleted(supabase, courseId, itemId, user.id);

      if (success) {
        // 상태 업데이트
        setCompletedItems(prev => [...prev, itemId]);
        setIsCompleted(true);
        return true;
      }

      return false;
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
    const success = await markCourseCompleted(supabase, courseId, user.id);
    
    if (success) {
      showToast('코스 학습이 완료되었습니다!', 'success');
      setIsCompleted(true);
      
      // 코스 상세 정보를 다시 불러와서 모든 아이템 ID 가져오기
      const courseData = await fetchCourseDetail(supabase, courseId);
      
      // sections가 있는지 확인 후 flatMap 사용
      if (courseData.sections && courseData.sections.length > 0) {
        const allItemIds = courseData.sections.flatMap(section => 
          section.items.map(item => item.id)
        );
        setCompletedItems(allItemIds);
      } else {
        // sections가 없는 경우 빈 배열 설정
        setCompletedItems([]);
      }
      
      return true;
    }

    return false;
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
      const success = await markWritingCompleted(supabase, courseId, content, user.id);

      if (success) {
        setHasWriting(true);
        showToast('글쓰기가 저장되었습니다!', 'success');
        return true;
      }

      return false;
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

// 모든 코스의 진행 상황을 한번에 가져오는 훅
export function useAllCourseProgress() {
  const [progressData, setProgressData] = useState<Record<string, { 
    completed: boolean, 
    writingCompleted: boolean 
  }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { supabase, user } = useSupabase();

  useEffect(() => {
    const loadAllProgress = async () => {
      if (!user) {
        setProgressData({});
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // 모든 코스 조회
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id');
          
        if (coursesError) throw coursesError;
        
        // 사용자의 모든 진행 정보 조회
        const { data: progress, error: progressError } = await supabase
          .from('course_progress')
          .select('course_id, completed')
          .eq('user_id', user.id);
          
        if (progressError) throw progressError;
        
        // 사용자의 모든 글쓰기 정보 조회
        const { data: writings, error: writingsError } = await supabase
          .from('course_writings')
          .select('course_id')
          .eq('user_id', user.id);
          
        if (writingsError) throw writingsError;
        
        // 데이터 처리
        const result: Record<string, { completed: boolean, writingCompleted: boolean }> = {};
        
        // 모든 코스에 대한 기본 상태 설정
        courses?.forEach(course => {
          result[course.id] = {
            completed: false,
            writingCompleted: false
          };
        });
        
        // 진행 정보 적용
        progress?.forEach(item => {
          if (item.completed && result[item.course_id]) {
            result[item.course_id].completed = true;
          }
        });
        
        // 글쓰기 정보 적용
        writings?.forEach(item => {
          if (result[item.course_id]) {
            result[item.course_id].writingCompleted = true;
          }
        });
        
        setProgressData(result);
      } catch (error) {
        console.error('진행 상황 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllProgress();
  }, [supabase, user]);

  return { progressData, isLoading };
}

// 사용자 권한 확인을 위한 훅
export function useCoursePermission() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      try {
        const admin = await isAdminUser();
        setIsAdmin(admin);
      } catch (error) {
        console.error('권한 확인 실패:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkPermission();
  }, []);
  return { isAdmin, isLoading };
}