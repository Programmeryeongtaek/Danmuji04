'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

// 타입 정의
export interface Inquiry {
  id: number;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'answered';
  response?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InquiryFilters {
  status?: 'all' | 'unread' | 'read' | 'answered';
  searchQuery?: string;
}

export interface RespondToInquiryParams {
  inquiryId: number;
  response: string;
}

export interface MarkAsReadParams {
  inquiryId: number;
}

export interface InquiryStats {
  unread: number;
  total: number;
}

// 쿼리 키 팩토리
export const inquiryKeys = {
  all: ['admin', 'inquiries'] as const,
  lists: () => [...inquiryKeys.all, 'list'] as const,
  list: (filters?: InquiryFilters) => [...inquiryKeys.lists(), filters] as const,
  detail: (id: number) => [...inquiryKeys.all, 'detail', id] as const,
  stats: () => [...inquiryKeys.all, 'stats'] as const,
};

// 문의 목록 필터링 조회
const fetchInquiries = async (filters?: InquiryFilters): Promise<Inquiry[]> => {
  const supabase = createClient();

  // 기본 쿼리 설정 (최신순)
  let query = supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  // 상태 필터 적용
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  let result = data || [];

  // 검색 필터 적용
  if (filters?.searchQuery?.trim()) {
    const searchQuery = filters.searchQuery.toLowerCase();
    result = result.filter(inquiry =>
      inquiry.name.toLowerCase().includes(searchQuery) ||
      inquiry.email.toLowerCase().includes(searchQuery) ||
      inquiry.subject.toLowerCase().includes(searchQuery) ||
      inquiry.message.toLowerCase().includes(searchQuery)
    );
  }

  return result;
};

// 문의에 대한 관리자 응답을 저장하는 함수
const respondToInquiry = async ({ inquiryId, response }: RespondToInquiryParams): Promise<Inquiry> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contact_messages')
    .update({
      status: 'answered',
      response,
      updated_at: new Date().toISOString()
    })
    .eq('id', inquiryId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 문의를 읽음 상태로 변경하는 함수
const markAsRead = async ({ inquiryId }: MarkAsReadParams): Promise<Inquiry> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contact_messages')
    .update({
      status: 'read',
      updated_at: new Date().toISOString()
    })
    .eq('id', inquiryId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 문의 통계 데이터를 조회하는 함수
const fetchInquiryStats = async (): Promise<InquiryStats> => {
  const supabase = createClient();

  // 병렬로 통계 데이터 조회
  const [unreadResult, totalResult] = await Promise.all([
    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unread'),
    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
  ]);

  if (unreadResult.error) throw unreadResult.error;
  if (totalResult.error) throw totalResult.error;

  return {
    unread: unreadResult.count || 0,
    total: totalResult.count || 0,
  };
};

// 문의 목록을 조회하는 훅
export const useInquiries = (filters?: InquiryFilters) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: inquiryKeys.list(filters),
    queryFn: () => fetchInquiries(filters),
    enabled: !!user, // 로그인된 사용자만 조회 가능
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false, // 백그라운드에서는 새로고침 x
  });
};

// 문의에 응답하는 훅
export const useRespondToInquiry = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: respondToInquiry,

    // 낙관적 업데이트
    onMutate: async ({ inquiryId, response }) => {
      // 진행 중인 관련 쿼리들 취소하여 충돌 방지
      await queryClient.cancelQueries({ queryKey: inquiryKeys.lists() });

      // 롤백을 위한 이전 데이터 백업
      const previousInquiries = queryClient.getQueryData(inquiryKeys.list());

      // 모든 문의 목록 캐시에 낙관적 업데이트 적용
      queryClient.setQueriesData(
        { queryKey: inquiryKeys.lists() },
        (oldData: Inquiry[] | undefined) => {
          if (!oldData) return oldData;

          return oldData.map(inquiry =>
            inquiry.id === inquiryId
              ? {
                ...inquiry,
                status: 'answered' as const,
                response,
                updated_at: new Date().toISOString(),
                }
              : inquiry
          );
        }
      );

      return { previousInquiries };
    },

    // 에러 발생 시 롤백
    onError: (error, variables, context) => {
      if (context?.previousInquiries) {
        queryClient.setQueryData(inquiryKeys.list(), context.previousInquiries);
      }
      console.error('문의 응답 실패:', error);
      showToast('응답 전송에 실패했습니다.', 'error');
    },

    // 성공 시 관련 캐시 무효화 및 성공 메시지
    onSuccess: () => {
      // 문의 관련 모든 캐시 무효화
      queryClient.invalidateQueries({ queryKey: inquiryKeys.all });
      // 대시보드 통계도 업데이트
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      showToast('응답이 전송되었습니다.', 'success');
    },
  });
};

// 문의를 읽음 상태로 변경하는 훅
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: markAsRead,

    // 낙관적 업데이트
    onMutate: async ({ inquiryId }) => {
      await queryClient.cancelQueries({ queryKey: inquiryKeys.lists() });

      const previousInquiries = queryClient.getQueryData(inquiryKeys.list());

      // 읽음 상태로 즉시 업데이트
      queryClient.setQueriesData(
        { queryKey: inquiryKeys.lists() },
        (oldData: Inquiry[] | undefined) => {
          if (!oldData) return oldData;

          return oldData.map(inquiry =>
            inquiry.id === inquiryId
              ? {
                ...inquiry,
                status: 'read' as const,
                updated_at: new Date().toISOString(),
                }
              : inquiry
          );
        }
      );

      return { previousInquiries };
    },

    // 에러 시 롤백
    onError: (error, vaiables, context) => {
      if (context?.previousInquiries) {
        queryClient.setQueryData(inquiryKeys.list(), context.previousInquiries);
      }
      console.error('읽음 상태 변경 실패:', error);
      showToast('읽음 상태로 변경에 실패했습니다.', 'error');
    },

    // 성공 시 캐시 무효화
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      showToast('읽음 상태로 변경되었습니다.', 'success');
    },
  });
};

// 문의 통계 데이터를 조회하는 훅
export const useInquiryStats = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: inquiryKeys.stats(),
    queryFn: fetchInquiryStats,
    enabled: !!user, // 로그인된 사용자만 조회
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};