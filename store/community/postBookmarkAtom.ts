import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

interface PostBookmarkState {
  bookmarkedPosts: Set<number>;
  isLoading: boolean;
}

const postBookmarkStateAtom = atom<PostBookmarkState>({
  bookmarkedPosts: new Set<number>(),
  isLoading: false,
});

// 읽기 전용
export const postBookmarkAtom = atom((get) => get(postBookmarkStateAtom));

// 단일 게시글 북마크 상태 초기화
export const initializePostBookmarkAtom = atom(
  null,
  async (get, set, postId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      const { data } = await supabase
        .from('post_bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      const currentState = get(postBookmarkStateAtom);
      const newBookmarkedPosts = new Set(currentState.bookmarkedPosts);

      if (data) {
        newBookmarkedPosts.add(postId);
      } else {
        newBookmarkedPosts.delete(postId);
      }

      set(postBookmarkStateAtom, {
        bookmarkedPosts: newBookmarkedPosts,
        isLoading: false,
      });
    } catch (error) {
      console.error('북마크 상태 초기화 실패:', error);
    }
  }
);

// 북마크 토글
export const togglePostBookmarkAtom = atom(
  null,
  async (get, set, postId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('로그인이 필요합니다.');

    const currentState = get(postBookmarkStateAtom);
    const isCurrentlyBookmarked = currentState.bookmarkedPosts.has(postId);

    // 낙관적 업데이트
    const newBookmarkedPosts = new Set(currentState.bookmarkedPosts);

    if (isCurrentlyBookmarked) {
      newBookmarkedPosts.delete(postId);
    } else {
      newBookmarkedPosts.add(postId);
    }

    set(postBookmarkStateAtom, {
      ...currentState,
      bookmarkedPosts: newBookmarkedPosts,
    });

    try {
      // 기존 togglePostBookmarks 함수 사용
      const { togglePostBookmarks } = await import('@/utils/services/community/postService');
      const result = await togglePostBookmarks(postId);
      return result;
    } catch (error) {
      // 실패 시 롤백
      set(postBookmarkStateAtom, currentState);
      throw error;
    }
  }
);

// 특정 게시글 북마크 상태 확인
export const isPostBookmarkedAtom = atom((get) => (postId: number) => {
  const state = get(postBookmarkStateAtom);
  return state.bookmarkedPosts.has(postId);
});