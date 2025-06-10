import { togglePostLike } from '@/utils/services/community/postService';
import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

interface PostLikeState {
  likedPosts: Set<number>;
  likeCounts: Record<number, number>;
  isLoading: boolean;
}

const postLikeStateAtom = atom<PostLikeState>({
  likedPosts: new Set<number>(),
  likeCounts: {},
  isLoading: false,
});

// 읽기 전용
export const postLikeAtom = atom((get) => get(postLikeStateAtom));

// 단일 게시글 좋아요 상태 초기화
export const initializePostLikeAtom = atom(
  null,
  async (get, set, postId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      // 좋아요 여부 확인
      const { data: likeData } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      // 좋아요 수 조회
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      const currentState = get(postLikeStateAtom);
      const newLikedPosts = new Set(currentState.likedPosts);
      const newLikeCounts = { ...currentState.likeCounts };

      if (likeData) {
        newLikedPosts.add(postId);
      } else {
        newLikedPosts.delete(postId);
      }

      newLikeCounts[postId] = count || 0;

      set(postLikeStateAtom, {
        likedPosts: newLikedPosts,
        likeCounts: newLikeCounts,
        isLoading: false,
      });
    } catch (error) {
      console.error('좋아요 상태 초기화 실패:', error);
    }
  }
);

// 좋아요 토글
export const togglePostLikeAtom = atom(
  null,
  async (get, set, postId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('로그인이 필요합니다.');

    const currentState = get(postLikeStateAtom);
    const isCurrentlyLiked = currentState.likedPosts.has(postId);
    const currentCount = currentState.likeCounts[postId] || 0;

    // 낙관적 업데이트
    const newLikedPosts = new Set(currentState.likedPosts);
    const newLikeCounts = { ...currentState.likeCounts };

    if (isCurrentlyLiked) {
      newLikedPosts.delete(postId);
      newLikeCounts[postId] = Math.max(0, currentCount - 1);
    } else {
      newLikedPosts.add(postId);
      newLikeCounts[postId] = currentCount + 1;
    }

    set(postLikeStateAtom, {
      ...currentState,
      likedPosts: newLikedPosts,
      likeCounts: newLikeCounts,
    });

    try {
      const result = await togglePostLike(postId, user.id);
      return result;
    } catch (error) {
      // 실패 시 롤백
      set(postLikeStateAtom, currentState);
      throw error;
    }
  }
);

// 특정 게시글 좋아요 상태 확인
export const getPostLikeStatusAtom = atom((get) => (postId: number) => {
  const state = get(postLikeStateAtom);
  return {
    isLiked: state.likedPosts.has(postId),
    likesCount: state.likeCounts[postId] || 0,
  };
});