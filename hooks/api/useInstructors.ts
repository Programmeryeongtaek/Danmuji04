'use client';

import { userAtom } from '@/store/auth';
import { BaseProfile, checkAdminPermission, processAvatarUrl } from '@/utils/common/adminUtils';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

export interface Instructor {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export interface InstructorProfile extends BaseProfile {
  name: string | null;
  nickname: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

export interface InstructorFilters {
  search?: string;
}

export interface InstructorStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
}

// 쿼리 키 팩토리
export const instructorKeys = {
  all: ['instructors'] as const,
  lists: () => [...instructorKeys.all, 'list'] as const,
  list: (filters?: InstructorFilters) => [...instructorKeys.lists(), filters] as const,
  details: () => [...instructorKeys.all, 'detail'] as const,
  detail: (id: string) => [...instructorKeys.details(), id] as const,
  stats: () => [...instructorKeys.all, 'stats'] as const,
};

// 강사 목록 조회
export const useInstructors = (filters?: InstructorFilters) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: instructorKeys.list(filters),
    queryFn: async (): Promise<Instructor[]> => {
      await checkAdminPermission();

      const supabase = createClient();
      
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'instructor')
        .order('created_at', { ascending: false });

      // 검색 필터링 (이름, 닉네임, 이메일)
      if (filters?.search?.trim()) {
        const searchTerm = filters.search.trim();
        query = query.or(`name.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // 아바타 URL 처리
      const enhancedInstructors = await Promise.all(
        (data || []).map(async (instructor: InstructorProfile) => 
          processAvatarUrl(instructor, supabase)
        )
      );

      return enhancedInstructors;
    },
    enabled: !!user,
    staleTime: 3 * 60 * 1000, // 3분 (강사 정보는 자주 변하지 않음)
    gcTime: 15 * 60 * 1000,
  });
};

// 개별 강사 정보 조회
export const useInstructor = (id: string) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: instructorKeys.detail(id),
    queryFn: async (): Promise<Instructor> => {
      await checkAdminPermission();

      const supabase = createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('role', 'instructor')
        .single();

      if (error) throw error;
      if (!data) throw new Error('강사를 찾을 수 없습니다.');

      // 아바타 URL 처리
      return await processAvatarUrl(data, supabase);
    },
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// 강사 통계 조회
export const useInstructorStats = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: instructorKeys.stats(),
    queryFn: async (): Promise<InstructorStats> => {
      await checkAdminPermission();

      const supabase = createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('role', 'instructor');

      if (error) throw error;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      const stats = (data || []).reduce(
        (acc, instructor) => {
          const createdAt = new Date(instructor.created_at);
          acc.total++;

          if (createdAt >= startOfMonth) acc.thisMonth++;
          if (createdAt >= startOfWeek) acc.thisWeek++;

          return acc;
        },
        { total: 0, thisMonth: 0, thisWeek: 0 }
      );

      return stats;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

// 강사 권한 해제 mutation
export const useRevokeInstructor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instructorId: string): Promise<void> => {
      await checkAdminPermission();

      const supabase = createClient();

      const { error } = await supabase
        .from('profiles')
        .update({ role: 'normal' })
        .eq('id', instructorId);

      if (error) throw error;
    },
    onMutate: async (instructorId) => {
      // 낙관적 업데이트를 위해 이전 쿼리 취소
      await queryClient.cancelQueries({ queryKey: instructorKeys.lists() });

      // 현재 데이터 백업
      const previousData = queryClient.getQueriesData({ queryKey: instructorKeys.lists() });

      // 낙관적 업데이트 - 해당 강사를 목록에서 제거
      queryClient.setQueriesData(
        { queryKey: instructorKeys.lists() },
        (old: Instructor[] | undefined) => {
          if (!old) return old;
          return old.filter(instructor => instructor.id !== instructorId);
        }
      );

      return { previousData };
    },
    onError: (err, instructorId, context) => {
      // 에러 발생시 이전 데이터로 롤백
      if (context?.previousData) {
        context?.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      // 성공시 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: instructorKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); // 관리자 대시보드 통계 업데이트
    },
  });
};

// 강사 권한 부여 mutation (일반 사용자를 강사로 승급)
export const usePromoteToInstructor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      await checkAdminPermission();

      const supabase = createClient();
      
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'instructor' })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      // 강사 목록 및 통계 무효화
      queryClient.invalidateQueries({ queryKey: instructorKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
};

// 강사 정보 업데이트 mutation
export const useUpdateInstructor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Pick<Instructor, 'name' | 'nickname'>> 
    }): Promise<void> => {
      await checkAdminPermission();

      const supabase = createClient();
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .eq('role', 'instructor');

      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      // 해당 강사의 상세 정보와 목록 무효화
      queryClient.invalidateQueries({ queryKey: instructorKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: instructorKeys.lists() });
    },
  });
};