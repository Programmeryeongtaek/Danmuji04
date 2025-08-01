import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

interface BookmarkState {
  studyBookmarks: Set<string>;
  isLoading: boolean;
  lastFetched: number | null;
}

// 기본 북마크 상태
const bookmarkStateAtom = atom<BookmarkState>({
  studyBookmarks: new Set<string>(),
  isLoading: false,
  lastFetched: null,
});

// 북마크 상태 읽기 전용
export const bookmarkAtom = atom((get) => get(bookmarkStateAtom));

// 북마크 초기화 (로그인 시 호출)
export const initializeBookmarksAtom = atom(
  null,
  async (get, set) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      set(bookmarkStateAtom, {
        studyBookmarks: new Set<string>(),
        isLoading: false,
        lastFetched: null,
      });
      return;
    }

    set(bookmarkStateAtom, (prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase
        .from('study_bookmarks')
        .select('study_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const bookmarkSet = new Set(data?.map(item => item.study_id) || []);
      
      set(bookmarkStateAtom, {
        studyBookmarks: bookmarkSet,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error('북마크 초기화 실패:', error);
      set(bookmarkStateAtom, (prev) => ({ ...prev, isLoading: false }));
    }
  }
);

// 북마크 토글
export const toggleBookmarkAtom = atom(
  null,
  async (get, set, studyId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const currentState = get(bookmarkStateAtom);
    const isCurrentlyBookmarked = currentState.studyBookmarks.has(studyId);

    // 낙관적 업데이트
    const newBookmarks = new Set(currentState.studyBookmarks);
    if (isCurrentlyBookmarked) {
      newBookmarks.delete(studyId);
    } else {
      newBookmarks.add(studyId);
    }

    set(bookmarkStateAtom, {
      ...currentState,
      studyBookmarks: newBookmarks,
    });

    try {
      if (isCurrentlyBookmarked) {
        // 북마크 제거
        const { error } = await supabase
          .from('study_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('study_id', studyId);

        if (error) throw error;
        return false;
      } else {
        // 북마크 추가
        const { error } = await supabase
          .from('study_bookmarks')
          .insert({
            user_id: user.id,
            study_id: studyId,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
        return true;
      }
    } catch (error) {
      // 실패 시 롤백
      set(bookmarkStateAtom, currentState);
      throw error;
    }
  }
);

// 특정 스터디의 북마크 상태 확인
export const isBookmarkedAtom = atom((get) => (studyId: string) => {
  const state = get(bookmarkStateAtom);
  return state.studyBookmarks.has(studyId);
});