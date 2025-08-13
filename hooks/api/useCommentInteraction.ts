// src/hooks/community/useCommentInteractions.ts
'use client';

import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';

interface CommentLikeStatus {
  commentId: number;
  isLiked: boolean;
  likesCount: number;
}

interface CommentsLikeStatus {
  [commentId: number]: {
    isLiked: boolean;
    likesCount: number;
  };
}

// 단일 댓글 좋아요 상태 조회
export const useCommentLikeStatus = (commentId: number) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: ['comment-like-status', commentId],
    queryFn: async (): Promise<CommentLikeStatus> => {
      const supabase = createClient();

      // 좋아요 수 조회
      const { count: likesCount } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);

      if (!user) {
        return { 
          commentId, 
          isLiked: false, 
          likesCount: likesCount || 0 
        };
      }

      // 사용자 좋아요 여부 조회
      const { data: likeData } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        commentId,
        isLiked: !!likeData,
        likesCount: likesCount || 0,
      };
    },
    enabled: !!commentId,
    staleTime: 5 * 60 * 1000,
  });
};

// 여러 댓글의 좋아요 상태 배치 조회
export const useCommentsLikeStatus = (commentIds: number[]) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: ['comments-like-status', commentIds.sort((a, b) => a - b)],
    queryFn: async (): Promise<CommentsLikeStatus> => {
      if (commentIds.length === 0) return {};

      const supabase = createClient();

      // 배치로 좋아요 수 조회
      const likeCountsQuery = supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds);

      const { data: likeCounts } = await likeCountsQuery;

      // 댓글별 좋아요 수 집계
      const commentLikeCounts = commentIds.reduce((acc, commentId) => {
        acc[commentId] = likeCounts?.filter(like => like.comment_id === commentId).length || 0;
        return acc;
      }, {} as Record<number, number>);

      if (!user) {
        return commentIds.reduce((acc, commentId) => {
          acc[commentId] = {
            isLiked: false,
            likesCount: commentLikeCounts[commentId],
          };
          return acc;
        }, {} as CommentsLikeStatus);
      }

      // 사용자가 좋아요한 댓글들 조회
      const { data: userLikes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);

      const likedCommentIds = new Set(userLikes?.map(like => like.comment_id) || []);

      return commentIds.reduce((acc, commentId) => {
        acc[commentId] = {
          isLiked: likedCommentIds.has(commentId),
          likesCount: commentLikeCounts[commentId],
        };
        return acc;
      }, {} as CommentsLikeStatus);
    },
    enabled: commentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// 댓글 좋아요 토글
export const useToggleCommentLike = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (commentId: number): Promise<boolean> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      // 현재 좋아요 상태 확인
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        // 좋아요 취소
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) throw error;
        return false;
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          });

        if (error) throw error;
        return true;
      }
    },
    onMutate: async (commentId: number) => {
      // 단일 댓글 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['comment-like-status', commentId] });
      
      // 댓글 배치 쿼리들도 취소
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'comments-like-status' &&
          Array.isArray(query.queryKey[1]) &&
          query.queryKey[1].includes(commentId)
      });

      // 이전 데이터 백업
      const previousSingleData = queryClient.getQueryData<CommentLikeStatus>(['comment-like-status', commentId]);

      // 단일 댓글 낙관적 업데이트
      if (previousSingleData) {
        queryClient.setQueryData<CommentLikeStatus>(['comment-like-status', commentId], {
          ...previousSingleData,
          isLiked: !previousSingleData.isLiked,
          likesCount: previousSingleData.isLiked 
            ? previousSingleData.likesCount - 1 
            : previousSingleData.likesCount + 1,
        });
      }

      // 배치 쿼리들 낙관적 업데이트
      queryClient.setQueriesData<CommentsLikeStatus>(
        { 
          predicate: (query) => 
            query.queryKey[0] === 'comments-like-status' &&
            Array.isArray(query.queryKey[1]) &&
            query.queryKey[1].includes(commentId)
        },
        (oldData) => {
          if (!oldData || !oldData[commentId]) return oldData;
          
          return {
            ...oldData,
            [commentId]: {
              isLiked: !oldData[commentId].isLiked,
              likesCount: oldData[commentId].isLiked 
                ? oldData[commentId].likesCount - 1 
                : oldData[commentId].likesCount + 1,
            },
          };
        }
      );

      return { previousSingleData };
    },
    onError: (error, commentId, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousSingleData) {
        queryClient.setQueryData(['comment-like-status', commentId], context.previousSingleData);
      }
      
      // 배치 쿼리 무효화로 정확한 데이터 다시 가져오기
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey[0] === 'comments-like-status' &&
          Array.isArray(query.queryKey[1]) &&
          query.queryKey[1].includes(commentId)
      });

      showToast('좋아요 처리에 실패했습니다.', 'error');
    },
    // commentId 파라미터를 제거하고 사용하지 않음을 명시
    onSuccess: (isLiked) => {
      showToast(
        isLiked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.',
        'success'
      );
    },
  });
};

// 댓글 삭제 시 관련 캐시 정리
export const useInvalidateCommentCache = () => {
  const queryClient = useQueryClient();

  return (commentId: number) => {
    // 해당 댓글의 모든 관련 쿼리 무효화
    queryClient.removeQueries({ queryKey: ['comment-like-status', commentId] });
    
    // 배치 쿼리에서도 해당 댓글 제거
    queryClient.invalidateQueries({
      predicate: (query) => 
        query.queryKey[0] === 'comments-like-status' &&
        Array.isArray(query.queryKey[1]) &&
        query.queryKey[1].includes(commentId)
    });
  };
};