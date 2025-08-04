'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

export interface CourseProgress {
  course_id: string;
  item_id: string;
  user_id: string;
  completed: boolean;
  completed_at?: string;
}

export interface CourseWritingStatus {
  course_id: string;
  user_id: string;
  has_writing: boolean;
}

// 쿼리 키 정의
export const courseProgressKeys = {
  all: ['course-progress'] as const,
  lists: () => [...courseProgressKeys.all, 'list'] as const,
  list: (userId: string) => [...courseProgressKeys.lists(), userId] as const,
  details: () => [...courseProgressKeys.all, 'detail'] as const,
  detail: (courseId: string, userId: string) => [...courseProgressKeys.details(), courseId, userId] as const,
  writings: () => [...courseProgressKeys.all, 'writings'] as const,
  writing: (courseId: string, userId: string) => [...courseProgressKeys.writings(), courseId, userId] as const,
};

// 특정 코스의 진도 조회
export const useCourseProgress = (courseId: string) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: courseProgressKeys.detail(courseId, user?.id || ''),
    queryFn: async (): Promise<{
      completedItems: string[];
      isCompleted: boolean;
      hasWriting: boolean;
    }> => {
      if (!user || !courseId) {
        return { completedItems: [], isCompleted: false, hasWriting: false };
      }

      const supabase = createClient();

      // 1. 완료된 아이템 목록 조회
      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .select('item_id, completed')
        .eq('course_id', courseId)
        .eq('user_id', user.id)

      if (progressError) throw progressError;

      const completedItems = progressData
        ?.filter(item => item.completed)
        .map(item => item.item_id) || [];

      // 2. 글쓰기 완료 여부 확인
      const { data: writingData, error: writingError } = await supabase
        .from('course_writings')
        .select('id')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .limit(1);

      if (writingError) throw writingError;

      return {
        completedItems,
        isCompleted: completedItems.length > 0,
        hasWriting: (writingData?.length || 0) > 0,
      };
    },
    enabled: Boolean(user && courseId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// 모든 코스의 진도 조회 (대시보드용)
export const useAllCoursesProgress = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: courseProgressKeys.list(user?.id || ''),
    queryFn: async (): Promise<Record<string, {
      completedItems: string[];
      isCompleted: boolean;
      hasWriting: boolean;
    }>> => {
      if (!user) return {};

      const supabase = createClient();

      // 1. 모든 코스 조회
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id');

      if (coursesError) throw coursesError;

      // 2. 사용자의 모든 코스 진도 조회
      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .select('course_id, item_id, completed')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // 3. 사용자의 모든 글쓰기 조회
      const { data: writingsData, error: writingsError } = await supabase
        .from('course_writings')
        .select('course_id')
        .eq('user_id', user.id);

      if (writingsError) throw writingsError;

      // 4. 코스별로 데이터 정리
      const result: Record<string, {
        completedItems: string[];
        isCompleted: boolean;
        hasWriting: boolean;
      }> = {};

      courses?.forEach(course => {
        const courseProgress = progressData?.filter(p => p.course_id === course.id) || [];
        const completedItems = courseProgress.filter(p => p.completed).map(p => p.item_id);
        const hasWriting = writingsData?.some(w => w.course_id === course.id) || false;

        result[course.id] = {
          completedItems,
          isCompleted: completedItems.length > 0,
          hasWriting,
        };
      });

      return result;
    },
    enabled: Boolean(user),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// 아이템 완료 처리
export const useMarkItemCompleted = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ courseId, itemId }: { courseId: string; itemId: string }) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      // upsert로 중복 처리 방지
      const { data, error } = await supabase
        .from('course_progress')
        .upsert({
          course_id: courseId,
          item_id: itemId,
          user_id: user.id,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ courseId, itemId }) => {
      if (!user) return;

      // 개별 코스 진도 쿼리 취소
      await queryClient.cancelQueries({
        queryKey: courseProgressKeys.detail(courseId, user.id),
      });

      // 전체 코스 진도 쿼리 취소  
      await queryClient.cancelQueries({
        queryKey: courseProgressKeys.list(user.id),
      });

      // 이전 데이터 백업
      const previousCourseData = queryClient.getQueryData(
        courseProgressKeys.detail(courseId, user.id)
      );
      const previousAllData = queryClient.getQueryData(
        courseProgressKeys.list(user.id)
      );

      // 낙관적 업데이트 - 개별 코스
      if (previousCourseData) {
        const currentData = previousCourseData as {
          completedItems: string[];
          isCompleted: boolean;
          hasWriting: boolean;
        };

        if (!currentData.completedItems.includes(itemId)) {
          queryClient.setQueryData(
            courseProgressKeys.detail(courseId, user.id),
            {
              ...currentData,
              completedItems: [...currentData.completedItems, itemId],
              isCompleted: true,
            }
          );
        }
      }

      // 낙관적 업데이트 - 전체 코스
      if (previousAllData) {
        const currentAllData = previousAllData as Record<string, {
          completedItems: string[];
          isCompleted: boolean;
          hasWriting: boolean;
        }>;

        const courseData = currentAllData[courseId] || {
          completedItems: [],
          isCompleted: false,
          hasWriting: false,
        };

        if (!courseData.completedItems.includes(itemId)) {
          queryClient.setQueryData(
            courseProgressKeys.list(user.id),
            {
              ...currentAllData,
              [courseId]: {
                ...courseData,
                completedItems: [...courseData.completedItems, itemId],
                isCompleted: true,
              },
            }
          );
        }
      }

      return { previousCourseData, previousAllData };
    },
    onError: (error, { courseId }, context) => {
      if (!user || !context) return;

      // 에러 시 이전 상태로 롤백
      if (context.previousCourseData) {
        queryClient.setQueryData(
          courseProgressKeys.detail(courseId, user.id),
          context.previousCourseData
        );
      }
      if (context.previousAllData) {
        queryClient.setQueryData(
          courseProgressKeys.list(user.id),
          context.previousAllData
        );
      }

      showToast('아이템 완료 처리에 실패했습니다.', 'error');
    },
    onSuccess: () => {
      showToast('학습이 완료되었습니다.', 'success');
    },
    onSettled: (data, error, { courseId }) => {
      if (!user) return;

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: courseProgressKeys.detail(courseId, user.id),
      });
      queryClient.invalidateQueries({
        queryKey: courseProgressKeys.list(user.id),
      });
    },
  });
};

// 전체 코스 완료 처리
export const useMarkCourseCompleted = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ courseId }: { courseId: string }) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      // 1. 코스의 모든 아이템 조회
      const { data: items, error: itemsError } = await supabase
        .from('course_items')
        .select('id')
        .eq('course_id', courseId);

      if (itemsError) throw itemsError;

      // 2. 모든 아이템을 완료 처리
      const progressData = items?.map(item => ({
        course_id: courseId,
        item_id: item.id,
        user_id: user.id,
        completed: true,
        completed_at: new Date().toISOString(),
      })) || [];

      const { error: upsertError } = await supabase
        .from('course_progress')
        .upsert(progressData);

      if (upsertError) throw upsertError;

      return { courseId, completedItems: items?.map(item => item.id) || [] };
    },
    onSuccess: ({ courseId }) => {
      if (!user) return;

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: courseProgressKeys.detail(courseId, user.id),
      });
      queryClient.invalidateQueries({
        queryKey: courseProgressKeys.list(user.id),
      });

      showToast('코스 학습이 완료되었습니다!', 'success');
    },
    onError: () => {
      showToast('코스 완료 처리에 실패했습니다.', 'error');
    },
  });
};

// 아이템 완료 여부 확인 (개별 아이템용)
export const useIsItemCompleted = (courseId: string, itemId: string) => {
  const { data: courseProgress } = useCourseProgress(courseId);
  
  return courseProgress?.completedItems.includes(itemId) || false;
};

// 코스 완료 여부 확인
export const useIsCourseCompleted = (courseId: string) => {
  const { data: courseProgress } = useCourseProgress(courseId);
  
  return courseProgress?.isCompleted || false;
};

// 글쓰기 완료 여부 확인
export const useHasWriting = (courseId: string) => {
  const { data: courseProgress } = useCourseProgress(courseId);
  
  return courseProgress?.hasWriting || false;
};