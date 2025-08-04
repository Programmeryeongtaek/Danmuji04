'use client';

import { CourseWithSections } from '@/app/types/course/courseModel';
import { Course, CourseItem } from '@/app/types/course/courseTypes';
import { useEffect, useState } from 'react';
import useSupabase from './useSupabase';
import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { isAdminUser } from '@/utils/supabase/auth';

// Supabase 쿼리 결과 타입 정의
interface CourseWithItems extends Course {
  course_items?: CourseItem[];
}

// 코스 목록 조회 훅
export function useCourseList(category?: string) {
  const [courses, setCourses] = useState<CourseWithSections[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // 코스와 아이템을 한 번에 조회 (섹션 구조 없이)
        let query = supabase
          .from('courses')
          .select(`
            *,
            course_items(
              id,
              title,
              description,
              youtube_id,
              order_num,
              created_at
            )
          `)
          .order('created_at', { ascending: false });

        if (category && category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;

        // 타입 캐스팅과 함께 데이터 변환
        const rawCourses = data as CourseWithItems[];
        
        // 데이터를 CourseWithSections 형태로 변환
        const coursesWithSections: CourseWithSections[] = rawCourses.map((course) => ({
          ...course,
          sections: [
            {
              id: 'main-section',
              title: '강의 목록',
              items: (course.course_items || [])
                .sort((a: CourseItem, b: CourseItem) => a.order_num - b.order_num)
            }
          ]
        }));

        setCourses(coursesWithSections);
      } catch (error) {
        console.error('코스 목록 로드 실패:', error);
        showToast('코스 목록을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourses();
  }, [category, showToast]);

  return { courses, isLoading, setCourses };
}

// 코스 상세 정보 조회 훅
export function useCourseDetail(courseId: string) {
  const [course, setCourse] = useState<CourseWithSections | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const { supabase } = useSupabase();

  useEffect(() => {
    if (!courseId) return;

    const loadCourseDetail = async () => {
      try {
        setIsLoading(true);

        // 코스와 아이템을 한 번에 조회
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            course_items(
              id,
              title,
              description,
              youtube_id,
              order_num,
              created_at,
              content
            )
          `)
          .eq('id', courseId)
          .single();

        if (error) throw error;

        // 타입 캐스팅
        const rawCourse = data as CourseWithItems;

        // CourseWithSections 형태로 변환
        const courseWithSections: CourseWithSections = {
          ...rawCourse,
          sections: [
            {
              id: 'main-section',
              title: '강의 목록',
              items: (rawCourse.course_items || [])
                .sort((a: CourseItem, b: CourseItem) => a.order_num - b.order_num)
            }
          ]
        };

        setCourse(courseWithSections);
      } catch (error) {
        console.error('코스 상세 정보 로드 실패:', error);
        showToast('코스 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourseDetail();
  }, [courseId, showToast, supabase]);

  return { course, isLoading };
}

// 코스 권한 확인 훅
export function useCoursePermission() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useSupabase();

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const adminStatus = await isAdminUser();
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('권한 확인 실패:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [user]);

  return { isAdmin, isLoading };
}

// 코스 생성 훅
export function useCourseCreate() {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { supabase, user } = useSupabase();

  const createCourse = async (courseData: Partial<Course>) => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      return null;
    }

    try {
      setIsLoading(true);

      // 관리자 권한 확인
      const adminStatus = await isAdminUser();
      if (!adminStatus) {
        showToast('관리자만 코스를 생성할 수 있습니다.', 'error');
        return null;
      }

      // 사용자 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .single();

      const instructorName = profile?.nickname || profile?.name || '익명';

      const { data, error } = await supabase
        .from('courses')
        .insert({
          ...courseData,
          instructor_id: user.id,
          instructor_name: instructorName,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      showToast('코스가 성공적으로 생성되었습니다.', 'success');
      return data;
    } catch (error) {
      console.error('코스 생성 실패:', error);
      showToast('코스 생성에 실패했습니다.', 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { createCourse, isLoading };
}

// 코스 업데이트 훅
export function useCourseUpdate() {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { supabase } = useSupabase();

  const updateCourse = async (courseId: string, courseData: Partial<Course>) => {
    try {
      setIsLoading(true);

      // 관리자 권한 확인
      const adminStatus = await isAdminUser();
      if (!adminStatus) {
        showToast('관리자만 코스를 수정할 수 있습니다.', 'error');
        return null;
      }

      const { data, error } = await supabase
        .from('courses')
        .update({
          ...courseData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;

      showToast('코스가 성공적으로 수정되었습니다.', 'success');
      return data;
    } catch (error) {
      console.error('코스 수정 실패:', error);
      showToast('코스 수정에 실패했습니다.', 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { updateCourse, isLoading };
}

// 코스 삭제 훅
export function useCourseDelete() {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { supabase } = useSupabase();

  const deleteCourse = async (courseId: string) => {
    try {
      setIsLoading(true);

      // 관리자 권한 확인
      const adminStatus = await isAdminUser();
      if (!adminStatus) {
        showToast('관리자만 코스를 삭제할 수 있습니다.', 'error');
        return false;
      }

      // 코스와 관련된 모든 데이터 삭제 (CASCADE 설정 필요)
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      showToast('코스가 성공적으로 삭제되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('코스 삭제 실패:', error);
      showToast('코스 삭제에 실패했습니다.', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteCourse, isLoading };
}

// 코스 검색 훅
export function useCourseSearch(searchQuery: string, filters?: {
  category?: string;
  level?: string;
}) {
  const [courses, setCourses] = useState<CourseWithSections[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!searchQuery.trim()) {
      setCourses([]);
      return;
    }

    const searchCourses = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        let query = supabase
          .from('courses')
          .select(`
            *,
            course_items(
              id,
              title,
              description,
              youtube_id,
              order_num,
              created_at
            )
          `)
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

        if (filters?.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }

        const { data, error } = await query;
        if (error) throw error;

        // 타입 캐스팅
        const rawCourses = data as CourseWithItems[];

        // CourseWithSections 형태로 변환
        const coursesWithSections: CourseWithSections[] = rawCourses.map((course) => ({
          ...course,
          sections: [
            {
              id: 'main-section',
              title: '강의 목록',
              items: (course.course_items || [])
                .sort((a: CourseItem, b: CourseItem) => a.order_num - b.order_num)
            }
          ]
        }));

        setCourses(coursesWithSections);
      } catch (error) {
        console.error('코스 검색 실패:', error);
        showToast('코스 검색에 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCourses, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, filters, showToast]);

  return { courses, isLoading };
}