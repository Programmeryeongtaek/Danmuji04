import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

interface LectureBookmarkState {
  lectureBookmarks: Set<number>;
  isLoading: boolean;
  lastFetched: number | null;
}

const lectureBookmarkStateAtom = atom<LectureBookmarkState>({
  lectureBookmarks: new Set<number>(),
  isLoading: false,
  lastFetched: null,
});

// 북마크 상태 읽기 전용
export const lectureBookmarkAtom = atom((get) => get(lectureBookmarkStateAtom));

// 북마크 초기화 (로그인 시 호출)
export const initializeLectureBookmarksAtom = atom(
  null,
  async (get, set) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      set(lectureBookmarkStateAtom, {
        lectureBookmarks: new Set<number>(),
        isLoading: false,
        lastFetched: null,
      });
      return;
    }

    set(lectureBookmarkStateAtom, (prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('lecture_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const bookmarkSet = new Set(data?.map(item => item.lecture_id) || []);

      set(lectureBookmarkStateAtom, {
        lectureBookmarks: bookmarkSet,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error('강의 북마크 초기화 실패:', error);
      set(lectureBookmarkStateAtom, (prev) => ({ ...prev, isLoading: false }));
    }
  }
);

// 북마크 토글
export const toggleLectureBookmarkAtom = atom(
  null,
  async (get, set, lectureId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const currentState = get(lectureBookmarkAtom);
    const isCurrentlyBookmarked = currentState.lectureBookmarks.has(lectureId);

    // 낙관적 업데이트
    const newBookmarks = new Set(currentState.lectureBookmarks);
    if (isCurrentlyBookmarked) {
      newBookmarks.delete(lectureId);
    } else {
      newBookmarks.add(lectureId);
    }

    set(lectureBookmarkStateAtom, {
      ...currentState,
      lectureBookmarks: newBookmarks,
    });

    try {
      if (isCurrentlyBookmarked) {
        // 북마크 제거
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('lecture_id', lectureId);

        if (error) throw error;
        return false;
      } else {
        // 북마크 추가
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            lecture_id: lectureId,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
        return true;
      }
    } catch (error) {
      // 실패 시 롤백
      set(lectureBookmarkStateAtom, currentState);
      throw error;
    }
  }
);

// 특정 강의의 북마크 상태 확인
export const isLectureBookmarkedAtom = atom((get) => (lectureId: number) => {
  const state = get(lectureBookmarkAtom);
  return state.lectureBookmarks.has(lectureId);
});