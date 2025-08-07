'use client';

import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// 전역 변수로 조회한 게시글 추적
const viewedPosts = new Set<number>();
const viewTimestamps = new Map<number, number>();

// 조회 여부 확인 함수
const hasViewedRecently = (postId: number): boolean => {
  const lastViewTime = viewTimestamps.get(postId);
  const now = Date.now();
  
  // 2초 이내에 조회한 게시글은 다시 조회하지 않음
  if (lastViewTime && (now - lastViewTime) < 2000) {
    return true;
  }
  
  return viewedPosts.has(postId);
};

// 조회 기록 함수
const markAsViewedGlobal = (postId: number): void => {
  viewedPosts.add(postId);
  viewTimestamps.set(postId, Date.now());
};

// 쿼리 키 정의
export const postViewKeys = {
  all: ['postView'] as const,
  lists: () => [...postViewKeys.all, 'list'] as const,
  list: (postId: number[]) => [...postViewKeys.lists(), ...postId.sort((a, b) => a - b)] as const,
  details: () => [...postViewKeys.all, 'detail'] as const,
  detail: (postId: number) => [...postViewKeys.details(), postId] as const,
};

interface PostViewCount {
  postId: number;
  views: number;
}

interface PostViewsData {
  [postId: number]: number;
}

// 개별 게시글 조회수 조회
export const usePostViewCount = (postId: number) => {
  return useQuery({
    queryKey: postViewKeys.detail(postId),
    queryFn: async (): Promise<PostViewCount> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('community_posts')
        .select('id, views')
        .eq('id', postId)
        .single();

      if (error) throw error;

      return {
        postId: data.id,
        views: data.views || 0,
      };
    },
    enabled: !!postId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// 여러 게시글 조회수 배치 조회
export const usePostViewCounts = (postIds: number[]) => {
  return useQuery({
    queryKey: postViewKeys.list(postIds),
    queryFn: async (): Promise<PostViewsData> => {
      if (postIds.length === 0) return {};

      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, views')
        .in('id', postIds);

      if (error) throw error;

      return data.reduce((acc, post) => {
        acc[post.id] = post.views || 0;
        return acc;
      }, {} as PostViewsData);
    },
    enabled: postIds.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// 게시글 조회수 증가
export const useIncrementPostView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: number): Promise<number> => {
      // 중복 조회 체크
      if (hasViewedRecently(postId)) {
        // 현재 캐시된 조회수 반환 (DB 호출 없이)
        const cachedData = queryClient.getQueryData<PostViewCount>(
          postViewKeys.detail(postId)
        );
        return cachedData?.views || 0;
      }

      // 조회 기록
      markAsViewedGlobal(postId);

      const supabase = createClient();
      
      // Supabase RPC 함수 호출하여 조회수 증가
      const { error } = await supabase.rpc('increment_post_view', { 
        post_id: postId 
      });

      if (error) {
        console.error(`조회수 증가 실패: ${postId}`, error);
        // 실패 시 조회 기록 제거
        viewedPosts.delete(postId);
        viewTimestamps.delete(postId);
        throw error;
      }

      // 증가된 조회수 반환 (낙관적 업데이트용)
      const currentData = queryClient.getQueryData<PostViewCount>(
        postViewKeys.detail(postId)
      );
      
      const newViewCount = (currentData?.views || 0) + 1; 
      return newViewCount;
    },
    onMutate: async (postId: number) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: postViewKeys.detail(postId) });

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData<PostViewCount>(
        postViewKeys.detail(postId)
      );

      // 낙관적 업데이트 (이미 조회한 게시글이 아닌 경우만)
      if (previousData && !hasViewedRecently(postId)) {
        queryClient.setQueryData<PostViewCount>(
          postViewKeys.detail(postId),
          {
            ...previousData,
            views: previousData.views + 1,
          }
        );
      }

      return { previousData };
    },
    onError: (error, postId, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousData) {
        queryClient.setQueryData(postViewKeys.detail(postId), context.previousData);
      }
      console.error('조회수 증가 실패:', error);
    },
    onSuccess: (newViewCount, postId) => {
      // 성공 시 정확한 데이터로 업데이트
      queryClient.setQueryData<PostViewCount>(
        postViewKeys.detail(postId),
        {
          postId,
          views: newViewCount,
        }
      );

      // 배치 쿼리들도 업데이트
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'postViews' &&
          query.queryKey[1] === 'list' &&
          Array.isArray(query.queryKey[2]) &&
          query.queryKey[2].includes(postId),
      });
    },
  });
};

// 세션 기반 중복 조회 방지를 위한 훅
export const usePostViewSession = () => {
  const hasViewed = (postId: number): boolean => {
    return hasViewedRecently(postId);
  };

  const markAsViewed = (postId: number): void => {
    markAsViewedGlobal(postId);
  };

  return { hasViewed, markAsViewed };
};