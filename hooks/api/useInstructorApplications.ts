'use client';

import { userAtom } from '@/store/auth';
import { checkAdminPermission } from '@/utils/common/adminUtils';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface InstructorApplication {
  id: number;
  user_id: string;
  name: string;
  email: string;
  phone_number: string;
  specialty: string;
  experience: string;
  motivation: string;
  status: ApplicationStatus;
  created_at: string;
  social_links?: string;
  certificate_url?: string;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  search?: string;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// 쿼리 키 팩토리
export const instructorApplicationKeys = {
  all: ['instructor-applications'] as const,
  lists: () => [...instructorApplicationKeys.all, 'list'] as const,
  list: (filters?: ApplicationFilters) => [...instructorApplicationKeys.lists(), filters] as const,
  details: () => [...instructorApplicationKeys.all, 'detail'] as const,
  detail: (id: number) => [...instructorApplicationKeys.details(), id] as const,
  stats: () => [...instructorApplicationKeys.all, 'stats'] as const,
};

// 강사 신청 목록 조회
export const useInstructorApplications = (filters?: ApplicationFilters) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: instructorApplicationKeys.list(filters),
    queryFn: async (): Promise<InstructorApplication[]> => {
      await checkAdminPermission();

      const supabase = createClient();
      
      let query = supabase
        .from('instructor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      // 상태 필터링
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // 검색 필터링 (이름, 이메일, 전문분야)
      if (filters?.search?.trim()) {
        const searchTerm = filters.search.trim();
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 10 * 60 * 1000, // 10분
  });
};

// 개별 강사 신청서 조회
export const useInstructorApplication = (id: number) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: instructorApplicationKeys.detail(id),
    queryFn: async (): Promise<InstructorApplication> => {
      await checkAdminPermission();

      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('instructor_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('신청서를 찾을 수 없습니다.');
      
      return data;
    },
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// 강사 신청 통계 조회
export const useInstructorApplicationStats = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: instructorApplicationKeys.stats(),
    queryFn: async (): Promise<ApplicationStats> => {
      await checkAdminPermission();

      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('instructor_applications')
        .select('status');

      if (error) throw error;

      const stats = (data || []).reduce(
        (acc, app) => {
          acc.total++;
          if (app.status === 'pending') acc.pending++;
          else if (app.status === 'approved') acc.approved++;
          else if (app.status === 'rejected') acc.rejected++;
          return acc;
        },
        { total: 0, pending: 0, approved: 0, rejected: 0 }
      );

      return stats;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// 강사 신청 승인 mutation
export const useApproveApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: number): Promise<boolean> => {
      await checkAdminPermission();

      const supabase = createClient();
      
      const { data, error } = await supabase.rpc(
        'approve_instructor_application',
        { application_id: applicationId }
      );

      if (error) throw error;
      if (!data) throw new Error('승인 처리에 실패했습니다.');
      
      return true;
    },
    onMutate: async (applicationId) => {
      // 낙관적 업데이트를 위해 이전 쿼리 취소
      await queryClient.cancelQueries({ queryKey: instructorApplicationKeys.lists() });

      // 현재 데이터 백업
      const previousData = queryClient.getQueriesData({ queryKey: instructorApplicationKeys.lists() });

      // 낙관적 업데이트 적용
      queryClient.setQueriesData(
        { queryKey: instructorApplicationKeys.lists() },
        (old: InstructorApplication[] | undefined) => {
          if (!old) return old;
          return old.map(app => 
            app.id === applicationId 
              ? { ...app, status: 'approved' as ApplicationStatus }
              : app
          );
        }
      );

      return { previousData };
    },
    onError: (err, applicationId, context) => {
      // 에러 발생시 이전 데이터로 롤백
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      // 성공시 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: instructorApplicationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); // 관리자 대시보드 통계 업데이트
    },
  });
};

// 강사 신청 거부 mutation
export const useRejectApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: number): Promise<boolean> => {
      await checkAdminPermission();

      const supabase = createClient();
      
      const { data, error } = await supabase.rpc(
        'reject_instructor_application',
        { application_id: applicationId }
      );

      if (error) throw error;
      if (!data) throw new Error('거부 처리에 실패했습니다.');
      
      return true;
    },
    onMutate: async (applicationId) => {
      // 낙관적 업데이트
      await queryClient.cancelQueries({ queryKey: instructorApplicationKeys.lists() });

      const previousData = queryClient.getQueriesData({ queryKey: instructorApplicationKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: instructorApplicationKeys.lists() },
        (old: InstructorApplication[] | undefined) => {
          if (!old) return old;
          return old.map(app => 
            app.id === applicationId 
              ? { ...app, status: 'rejected' as ApplicationStatus }
              : app
          );
        }
      );

      return { previousData };
    },
    onError: (err, applicationId, context) => {
      // 롤백
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: instructorApplicationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
};

// 강사 신청서 삭제 mutation (필요한 경우)
export const useDeleteApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: number): Promise<void> => {
      await checkAdminPermission();

      const supabase = createClient();
      
      const { error } = await supabase
        .from('instructor_applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instructorApplicationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
};