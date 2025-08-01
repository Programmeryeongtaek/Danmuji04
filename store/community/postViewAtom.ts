import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

interface PostViewState {
  viewCounts: Record<number, number>;
  sessionViews: Set<number>;
}

const postViewStateAtom = atom<PostViewState>({
  viewCounts: {},
  sessionViews: new Set<number>(),
});

// 읽기 전용
export const postViewAtom = atom((get) => get(postViewStateAtom));

// 게시글 조회수 초기화 (게시글 목록에서 사용)
export const initializePostViewCountsAtom = atom(
  null,
  async (get, set, posts: { id: number; views: number }[]) => {
    const currentState = get(postViewStateAtom);
    const newViewCounts = { ...currentState.viewCounts };

    posts.forEach(({ id, views }) => {
      newViewCounts[id] = views;
    });

    set(postViewStateAtom, {
      ...currentState,
      viewCounts: newViewCounts,
    });
  }
);

// 게시글 조회 처리 (같은 세션 내 중복 렌더링만 방지)
export const viewPostAtom = atom(
  null,
  async (get, set, postId: number) => {
    const currentState = get(postViewStateAtom);

    // 현재 세션에서 이미 조회했는지 확인 (중복 렌더링 방지)
    if (currentState.sessionViews.has(postId)) {
      return false; // 이미 처리됨
    }

    // 낙관적 업데이트 - 조회수 즉시 증가
    const newSessionViews = new Set(currentState.sessionViews);
    const newViewCounts = { ...currentState.viewCounts };

    newSessionViews.add(postId);
    newViewCounts[postId] = (newViewCounts[postId] || 0) + 1;

    set(postViewStateAtom, {
      viewCounts: newViewCounts,
      sessionViews: newSessionViews,
    });

    try {
      // 백그라운드에서 서버 업데이트 (Supabase RPC 함수 직접 호출)
      const supabase = createClient();
      await supabase.rpc('increment_post_view', { post_id: postId });
      return true; // 조회수 증가됨
    } catch (error) {
      console.error('조회수 업데이트 실패:', error);
      
      // 실패 시 롤백
      set(postViewStateAtom, currentState);
      return false;
    }
  }
);

// 특정 게시글 조회수 가져오기
export const getPostViewCountAtom = atom((get) => (postId: number) => {
  const state = get(postViewStateAtom);
  return state.viewCounts[postId] || 0;
});

// 조회한 게시글인지 확인 (현재 세션에서만)
export const isPostViewedInSessionAtom = atom((get) => (postId: number) => {
  const state = get(postViewStateAtom);
  return state.sessionViews.has(postId);
});

// 새로고침 시 세션 초기화 (조회수는 유지)
export const resetSessionViewsAtom = atom(
  null,
  (get, set) => {
    const currentState = get(postViewStateAtom);
    set(postViewStateAtom, {
      ...currentState,
      sessionViews: new Set<number>(),
    });
  }
);

// 전체 상태 초기화 (개발용)
export const clearViewStateAtom = atom(
  null,
  (get, set) => {
    set(postViewStateAtom, {
      viewCounts: {},
      sessionViews: new Set<number>(),
    });
  }
);