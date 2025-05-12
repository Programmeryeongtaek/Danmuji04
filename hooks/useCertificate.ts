'use client';

import { useToast } from '@/components/common/Toast/Context';
import { CourseCategory } from '@/app/types/course/categories';

import { useCallback, useEffect,  useState } from 'react';
import useSupabase from './useSupabase';

export interface Certificate {
  id: number;
  user_id: string;
  category: string;
  issued_at: string;
  updated_at: string | null;
  is_outdated: boolean;
  completed_courses: string[];
}

// 특정 카테고리의 수료증 정보를 가져오는 훅
export function useCertificate(category: CourseCategory) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();
  const { supabase, user } = useSupabase();

  const fetchCertificate = useCallback(async () => {
    if (!user) {
      setCertificate(null);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', category)
        .maybeSingle();
        
      if (error) throw error;
      setCertificate(data);
    } catch (error) {
      console.error('수료증 정보 불러오기 실패:', error);
      showToast('수료증 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [category, showToast, supabase, user]);

  useEffect(() => {
    fetchCertificate();
  }, [fetchCertificate]);

  const refreshCertificate = useCallback(async () => {
    if (!certificate || !user) return false;

    try {
      // 해당 카테고리의 모든 강의 ID 가져오기
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('category', category);

      if (coursesError) throw coursesError;
      if (!courses || courses.length === 0) {
        showToast('카테고리에 해당하는 강의가 없습니다.', 'error'); 
        return false;
      }

      const courseIds = courses.map(course => course.id);

      // 완료된 강의 확인
      const { data: progress, error: progressError } = await supabase
        .from('course_progress')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('course_id', courseIds);

      if (progressError) throw progressError;
      const completedCourseIds = progress?.map(p => p.course_id) || [];

      // 모든 강의를 완료했는지 확인
      const allCompleted = courseIds.every(id => completedCourseIds.includes(id));

      if (!allCompleted) {
        showToast('모든 강의를 완료해야 수료증을 갱신할 수 있습니다.', 'error');
        return false;
      }

      // 수료증 갱신
      const { error: updateError } = await supabase
        .from('certificates')
        .update({
          is_outdated: false,
          updated_at: new Date().toISOString(),
          completed_courses: courseIds
        })
        .eq('id', certificate.id);

      if (updateError) throw updateError;
      
      showToast('수료증이 갱신되었습니다.', 'success');
      fetchCertificate();
      return true;
    } catch (error) {
      console.error('수료증 갱신 실패:', error);
      showToast('수료증 갱신에 실패했습니다.', 'error');
      return false;
    }
  }, [certificate, category, fetchCertificate, showToast, supabase, user]);

  return {
    certificate,
    isLoading,
    refreshCertificate,
    fetchCertificate
  };
}