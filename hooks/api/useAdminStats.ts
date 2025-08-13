'use client';

import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

export interface AdminStats {
  totalUsers: number;
  totalInstructors: number;
  pendingApplications: number;
  pendingInquiries: number;
}

// 쿼리 키 팩토리
export const adminStatsKeys = {
  all: ['admin', 'stats'] as const,
  dashboard: () => [...adminStatsKeys.all, 'dashboard'] as const,
};

// 병렬로 모든 통계 데이터 조회
const fetchAdminStats = async (): Promise<AdminStats> => {
  const supabase = createClient();

  // 병렬로 모든 통계 요청
  const [usersResult, instructorsResult, applicationsResult, inquiriesResult] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
    supabase.from('instructor_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
  ]);

  // 에러 확인
  if (usersResult.error) throw usersResult.error;
  if (instructorsResult.error) throw instructorsResult.error;
  if (applicationsResult.error) throw applicationsResult.error;
  if (inquiriesResult.error) throw inquiriesResult.error;

  return {
    totalUsers: usersResult.count || 0,
    totalInstructors: instructorsResult.count || 0,
    pendingApplications: applicationsResult.count || 0,
    pendingInquiries: inquiriesResult.count || 0,
  };
};

export const useAdminStats = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: adminStatsKeys.dashboard(),
    queryFn: fetchAdminStats,
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};