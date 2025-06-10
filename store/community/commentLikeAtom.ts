import { toggleCommentLike } from '@/utils/services/community/commentService';
import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

interface CommentLikeState {
  likedComments: Set<number>;
  likeCounts: Record<number, number>;
  isLoading: false;
}

const commentLikeStateAtom = atom<CommentLikeState>({
  likedComments: new Set<number>(),
  likeCounts: {},
  isLoading: false,
});

// 읽기 전용
export const commentLikeAtom = atom((get) => get(commentLikeStateAtom));

// 게시글의 모든 댓글 좋아요 상태 초기화
export const initializeCommentsLikeAtom = atom(
  null,
  async (get, set, commentIds: number[]) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || commentIds.length === 0) return;

    try {
      // 사용자가 좋아요한 댓글들 조회
      const { data: likedComments } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);

      // 각 댓글의 좋아요 수 조회
      const likeCountPromises = commentIds.map(async (commentId) => {
        const { count } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', commentId);
        
        return { commentId, count: count || 0 };
      });

      const likeCounts = await Promise.all(likeCountPromises);

      const currentState = get(commentLikeStateAtom);
      const newLikedComments = new Set(currentState.likedComments);
      const newLikeCounts = { ...currentState.likeCounts };

      // 좋아요한 댓글들 추가
      likedComments?.forEach(({ comment_id }) => {
        newLikedComments.add(comment_id);
      });

      // 좋아요 수 업데이트
      likeCounts.forEach(({ commentId, count }) => {
        newLikeCounts[commentId] = count;
      });

      set(commentLikeStateAtom, {
        likedComments: newLikedComments,
        likeCounts: newLikeCounts,
        isLoading: false,
      });
    } catch (error) {
      console.error('댓글 좋아요 상태 초기화 실패:', error);
    }
  }
);

// 단일 댓글 좋아요 상태 초기화 (필요시)
export const initializeCommentLikeAtom = atom(
  null,
  async (get, set, commentId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      // 좋아요 여부 확인
      const { data: likeData } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      // 좋아요 수 조회
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);

      const currentState = get(commentLikeStateAtom);
      const newLikedComments = new Set(currentState.likedComments);
      const newLikeCounts = { ...currentState.likeCounts };

      if (likeData) {
        newLikedComments.add(commentId);
      } else {
        newLikedComments.delete(commentId);
      }

      newLikeCounts[commentId] = count || 0;

      set(commentLikeStateAtom, {
        likedComments: newLikedComments,
        likeCounts: newLikeCounts,
        isLoading: false,
      });
    } catch (error) {
      console.error('댓글 좋아요 상태 초기화 실패:', error);
    }
  }
);

// 댓글 좋아요 토글
export const toggleCommentLikeAtom = atom(
  null,
  async (get, set, commentId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('로그인이 필요합니다.');

    const currentState = get(commentLikeStateAtom);
    const isCurrentlyLiked = currentState.likedComments.has(commentId);
    const currentCount = currentState.likeCounts[commentId] || 0;

    // 낙관적 업데이트
    const newLikedComments = new Set(currentState.likedComments);
    const newLikeCounts = { ...currentState.likeCounts };

    if (isCurrentlyLiked) {
      newLikedComments.delete(commentId);
      newLikeCounts[commentId] = Math.max(0, currentCount - 1);
    } else {
      newLikedComments.add(commentId);
      newLikeCounts[commentId] = currentCount + 1;
    }

    set(commentLikeStateAtom, {
      ...currentState,
      likedComments: newLikedComments,
      likeCounts: newLikeCounts,
    });

    try {
      const result = await toggleCommentLike(commentId, user.id);
      return result;
    } catch (error) {
      // 실패 시 롤백
      set(commentLikeStateAtom, currentState);
      throw error;
    }
  }
);

// 특정 댓글 좋아요 상태 확인
export const getCommentLikeStatusAtom = atom((get) => (commentId: number) => {
  const state = get(commentLikeStateAtom);
  return {
    isLiked: state.likedComments.has(commentId),
    likesCount: state.likeCounts[commentId] || 0,
  };
});

// 댓글 삭제 시 상태에서 제거
export const removeCommentFromLikeStateAtom = atom(
  null,
  (get, set, commentId: number) => {
    const currentState = get(commentLikeStateAtom);
    const newLikedComments = new Set(currentState.likedComments);
    const newLikeCounts = { ...currentState.likeCounts };

    newLikedComments.delete(commentId);
    delete newLikeCounts[commentId];

    set(commentLikeStateAtom, {
      ...currentState,
      likedComments: newLikedComments,
      likeCounts: newLikeCounts,
    });
  }
);