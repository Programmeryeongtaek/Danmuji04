'use client';

import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

export type EnrollmentStatus = 'active' | 'completed' | 'cancelled';

export interface EnrollmentData {
  lecture_id: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at?: string;
}

export interface EnrollmentStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
}

export interface LectureEnrollmentInfo {
  isEnrolled: boolean;
  status: EnrollmentStatus | null;
  lastWatchedItem?: number | null;
}

// 쿼리 키 팩토리
export const enrollmentKeys = {
  all: ['enrollments'] as const,
  lists: () => [...enrollmentKeys.all, 'list'] as const,
  list: (userId: string) => [...enrollmentKeys.lists(), userId] as const,
  details: () => [...enrollmentKeys.all, 'detail'] as const,
  detail: (lectureId: number, userId: string) => [...enrollmentKeys.details(), lectureId, userId] as const,
  stats: (userId: string) => [...enrollmentKeys.all, 'stats', userId] as const,
};

// 사용자의 모든 수강 정보 조회
export const useEnrollmentList = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: enrollmentKeys.list(user?.id || ''),
    queryFn: async (): Promise<EnrollmentData[]> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('enrollments')
        .select('lecture_id, status, enrolled_at, completed_at')
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// 특정 강의의 수강 상태 조회
export const useEnrollmentStatus = (lectureId: number) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: enrollmentKeys.detail(lectureId, user?.id || ''),
    queryFn: async (): Promise<LectureEnrollmentInfo> => {
      if (!user) {
        return { isEnrolled: false, status: null };
      }

      const supabase = createClient();

      // 수강 정보 조회
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('status')
        .eq('lecture_id', lectureId)
        .eq('user_id', user.id)
        .maybeSingle();

      // 마지막 시청 아이템 조회
      const { data: progress } = await supabase
        .from('lecture_progress')
        .select('last_watched_item_id')
        .eq('lecture_id', lectureId)
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        isEnrolled: !!enrollment,
        status: enrollment?.status || null,
        lastWatchedItem: progress?.last_watched_item_id || null,
      };
    },
    enabled: !!user && !!lectureId,
    staleTime: 2 * 60 * 1000,
  });
};

// 수강 통계 조회
export const useEnrollmentStats = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: enrollmentKeys.stats(user?.id || ''),
    queryFn: async (): Promise<EnrollmentStats> => {
      if (!user) {
        return { total: 0, active: 0, completed: 0, cancelled: 0 };
      }

      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('enrollments')
        .select('status')
        .eq('user_id', user.id);

      if (error) throw error;

      const stats = data?.reduce(
        (acc, enrollment) => {
          acc.total++;
          // 타입 안전하게 처리
          if (enrollment.status === 'active') acc.active++;
          else if (enrollment.status === 'completed') acc.completed++;
          else if (enrollment.status === 'cancelled') acc.cancelled++;
          return acc;
        },
        { total: 0, active: 0, completed: 0, cancelled: 0 }
      );

      return stats || { total: 0, active: 0, completed: 0, cancelled: 0 };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// 수강신청 mutation
export const useEnrollLecture = () => {
  const queryClient = useQueryClient();
  const user = useAtomValue(userAtom);

  return useMutation({
    mutationFn: async (lectureId: number): Promise<void> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      // 기존 수강 정보 확인
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('lecture_id', lectureId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingEnrollment) {
        if (existingEnrollment.status === 'active') {
          throw new Error('이미 수강 중인 강의입니다.');
        }
        
        // 취소된 수강 정보가 있으면 재활성화
        const { error: updateError } = await supabase
          .from('enrollments')
          .update({ 
            status: 'active',
            enrolled_at: new Date().toISOString(),
          })
          .eq('id', existingEnrollment.id);
          
        if (updateError) throw updateError;
      } else {
        // 새로운 수강 등록
        const { error: insertError } = await supabase
          .from('enrollments')
          .insert({
            lecture_id: lectureId,
            user_id: user.id,
            status: 'active',
            enrolled_at: new Date().toISOString(),
          });
          
        if (insertError) throw insertError;
      }

      // 수강생 수 업데이트
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('lecture_id', lectureId)
        .eq('status', 'active');

      await supabase
        .from('lectures')
        .update({ students: count || 0 })
        .eq('id', lectureId);
    },
    onSuccess: (_, lectureId) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.detail(lectureId, user?.id || '') });
      
      // 강의 목록 쿼리도 무효화 (수강생 수 업데이트를 위해)
      queryClient.invalidateQueries({ queryKey: ['lectures'] });
    },
  });
};

// 수강 취소 mutation
export const useCancelEnrollment = () => {
  const queryClient = useQueryClient();
  const user = useAtomValue(userAtom);

  return useMutation({
    mutationFn: async (lectureId: number): Promise<void> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      // 수강 정보 삭제
      const { error: deleteError } = await supabase
        .from('enrollments')
        .delete()
        .eq('lecture_id', lectureId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // 수강생 수 업데이트
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('lecture_id', lectureId)
        .eq('status', 'active');

      await supabase
        .from('lectures')
        .update({ students: count || 0 })
        .eq('id', lectureId);
    },
    onSuccess: (_, lectureId) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.detail(lectureId, user?.id || '') });
      
      // 강의 목록 쿼리도 무효화
      queryClient.invalidateQueries({ queryKey: ['lectures'] });
    },
  });
};

// 수강 완료 처리 mutation
export const useCompleteLecture = () => {
  const queryClient = useQueryClient();
  const user = useAtomValue(userAtom);

  return useMutation({
    mutationFn: async (lectureId: number): Promise<void> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      const { error } = await supabase
        .from('enrollments')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('lecture_id', lectureId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, lectureId) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.detail(lectureId, user?.id || '') });
    },
  });
};

// 마지막 시청 위치 업데이트 mutation
export const useUpdateLastWatchedItem = () => {
  const queryClient = useQueryClient();
  const user = useAtomValue(userAtom);

  return useMutation({
    mutationFn: async ({ lectureId, itemId }: { lectureId: number; itemId: number }): Promise<void> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      const { error } = await supabase
        .from('lecture_progress')
        .upsert({
          user_id: user.id,
          lecture_id: lectureId,
          last_watched_item_id: itemId,
          last_watched_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: (_, { lectureId }) => {
      // 해당 강의의 수강 상태 쿼리만 무효화
      queryClient.invalidateQueries({ 
        queryKey: enrollmentKeys.detail(lectureId, user?.id || '') 
      });
    },
  });
};