// src/hooks/community/usePostInteractions.ts
'use client';

import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';

interface PostLikeStatus {
  isLiked: boolean;
  likesCount: number;
}

interface PostBookmarkStatus {
  isBookmarked: boolean;
}

// 게시글 좋아요 상태 조회
export const usePostLikeStatus = (postId: number) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: ['post-like-status', postId],
    queryFn: async (): Promise<PostLikeStatus> => {
      const supabase = createClient();

      // 좋아요 수 조회
      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (!user) {
        return { isLiked: false, likesCount: likesCount || 0 };
      }

      // 사용자 좋아요 여부 조회
      const { data: likeData } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        isLiked: !!likeData,
        likesCount: likesCount || 0,
      };
    },
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// 게시글 좋아요 토글
export const useTogglePostLike = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (postId: number): Promise<boolean> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      // 현재 좋아요 상태 확인
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        // 좋아요 취소
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) throw error;
        return false;
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error) throw error;
        return true;
      }
    },
    onMutate: async (postId: number) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['post-like-status', postId] });

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData<PostLikeStatus>(['post-like-status', postId]);

      // 낙관적 업데이트
      if (previousData) {
        queryClient.setQueryData<PostLikeStatus>(['post-like-status', postId], {
          isLiked: !previousData.isLiked,
          likesCount: previousData.isLiked
            ? previousData.likesCount - 1
            : previousData.likesCount + 1,
        });
      }

      return { previousData };
    },
    onError: (error, postId, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousData) {
        queryClient.setQueryData(['post-like-status', postId], context.previousData);
      }
      showToast('좋아요 처리에 실패했습니다.', 'error');
    },
    // postId 파라미터를 제거하고 사용하지 않음을 명시
    onSuccess: (isLiked) => {
      showToast(
        isLiked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.',
        'success'
      );
      
      // 관련 쿼리 무효화 (게시글 목록 등)
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// 게시글 북마크 상태 조회
export const usePostBookmarkStatus = (postId: number) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: ['post-bookmark-status', postId],
    queryFn: async (): Promise<PostBookmarkStatus> => {
      if (!user) {
        return { isBookmarked: false };
      }

      const supabase = createClient();
      const { data } = await supabase
        .from('post_bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      return { isBookmarked: !!data };
    },
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
  });
};

// 게시글 북마크 토글
export const useTogglePostBookmark = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (postId: number): Promise<boolean> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      // 현재 북마크 상태 확인
      const { data: existingBookmark } = await supabase
        .from('post_bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingBookmark) {
        // 북마크 제거
        const { error } = await supabase
          .from('post_bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (error) throw error;
        return false;
      } else {
        // 북마크 추가
        const { error } = await supabase
          .from('post_bookmarks')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error) throw error;
        return true;
      }
    },
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries({ queryKey: ['post-bookmark-status', postId] });

      const previousData = queryClient.getQueryData<PostBookmarkStatus>(['post-bookmark-status', postId]);

      if (previousData) {
        queryClient.setQueryData<PostBookmarkStatus>(['post-bookmark-status', postId], {
          isBookmarked: !previousData.isBookmarked,
        });
      }

      return { previousData };
    },
    onError: (error, postId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['post-bookmark-status', postId], context.previousData);
      }
      showToast('북마크 처리에 실패했습니다.', 'error');
    },
    // postId 파라미터를 제거하고 사용하지 않음을 명시
    onSuccess: (isBookmarked) => {
      showToast(
        isBookmarked ? '북마크에 추가되었습니다.' : '북마크가 취소되었습니다.',
        'success'
      );
      
      // 북마크 목록 무효화
      queryClient.invalidateQueries({ queryKey: ['bookmarked-posts'] });
    },
  });
};