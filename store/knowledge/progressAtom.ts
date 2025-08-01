import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

export interface LectureProgress {
  completedItems: number[]; // 완료된 아이템 ID 목록
  totalItems: number;
  progressPercentage: number;
  lastWatchedAt: string; // 마지막 시청 시간
  lastWatchedItemId: number | null; // 마지막 시청 아이템 ID
}

export interface ProgressState {
  lectureProgress: Record<number, LectureProgress>; // 강의별 진도 정보
  isLoading: boolean;
  lastFetched: number | null; // 마지막 조회 시간
}

// 기본 진도 상태
const progressStateAtom = atom<ProgressState>({
  lectureProgress: {},
  isLoading: false,
  lastFetched: null,
});

// 진도 상태 읽기 전용
export const progressAtom = atom((get) => get(progressStateAtom));

// 진도 상태 초기화 (로그인 시 호출)
export const initializeProgressAtom = atom(
  null,
  async (get, set) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      set(progressStateAtom, {
        lectureProgress: {},
        isLoading: false,
        lastFetched: null,
      });
      return;
    }

    set(progressStateAtom, (prev) => ({ ...prev, isLoading: true }));

    try {
      // 사용자의 모든 진도 정보 조회
      const { data: progressData, error: progressError } = await supabase
        .from('lecture_progress')
        .select(`
          lecture_id,
          completed_items,
          total_items,
          progress_percentage,
          last_watched_at,
          last_watched_item_id
        `)
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // 진도 데이터 가공
      const progressMap: Record<number, LectureProgress> = {};
      
      progressData?.forEach(item => {
        progressMap[item.lecture_id] = {
          completedItems: item.completed_items || [],
          totalItems: item.total_items || 0,
          progressPercentage: item.progress_percentage || 0,
          lastWatchedAt: item.last_watched_at || '',
          lastWatchedItemId: item.last_watched_item_id || null,
        };
      });
      
      set(progressStateAtom, {
        lectureProgress: progressMap,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error('진도 상태 초기화 실패:', error);
      set(progressStateAtom, (prev) => ({ ...prev, isLoading: false }));
    }
  }
);

// 특정 강의 진도 정보 조회
export const fetchLectureProgressAtom = atom(
  null,
  async (get, set, lectureId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      // 해당 강의의 진도 정보 조회
      const { data: progressData, error: progressError } = await supabase
        .from('lecture_progress')
        .select(`
          completed_items,
          total_items,
          progress_percentage,
          last_watched_at,
          last_watched_item_id
        `)
        .eq('user_id', user.id)
        .eq('lecture_id', lectureId)
        .single();

      if (progressError && progressError.code !== 'PGRST116') { // 데이터 없음 에러가 아닌 경우
        throw progressError;
      }

      // 강의 전체 아이템 수 조회 (섹션별 아이템 수 합계)
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('lecture_sections')
        .select(`
          lecture_items(id)
        `)
        .eq('lecture_id', lectureId);

      if (sectionsError) throw sectionsError;

      const totalItems = sectionsData?.reduce((total, section) => {
        return total + (section.lecture_items?.length || 0);
      }, 0) || 0;

      const currentState = get(progressStateAtom);
      
      const progressInfo: LectureProgress = {
        completedItems: progressData?.completed_items || [],
        totalItems,
        progressPercentage: progressData?.progress_percentage || 0,
        lastWatchedAt: progressData?.last_watched_at || '',
        lastWatchedItemId: progressData?.last_watched_item_id || null,
      };
      
      set(progressStateAtom, {
        ...currentState,
        lectureProgress: {
          ...currentState.lectureProgress,
          [lectureId]: progressInfo,
        },
      });
      
      return progressInfo;
    } catch (error) {
      console.error('강의 진도 조회 실패:', error);
      throw error;
    }
  }
);

// 아이템 완료 처리
export const markItemCompletedAtom = atom(
  null,
  async (get, set, lectureId: number, itemId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const currentState = get(progressStateAtom);
    const currentProgress = currentState.lectureProgress[lectureId];
    
    if (!currentProgress) {
      // 진도 정보가 없으면 먼저 조회
      try {
        await set(fetchLectureProgressAtom, lectureId);
        const updatedState = get(progressStateAtom);
        const fetchedProgress = updatedState.lectureProgress[lectureId];
        if (!fetchedProgress) return false;
      } catch (error) {
        console.error('진도 정보 조회 실패:', error);
        return false;
      }
    }

    const progress = get(progressStateAtom).lectureProgress[lectureId];
    
    // 이미 완료된 아이템인지 확인
    if (progress.completedItems.includes(itemId)) {
      return true;
    }

    // 낙관적 업데이트
    const newCompletedItems = [...progress.completedItems, itemId];
    const newProgressPercentage = Math.round((newCompletedItems.length / progress.totalItems) * 100);
    
    const updatedProgress: LectureProgress = {
      ...progress,
      completedItems: newCompletedItems,
      progressPercentage: newProgressPercentage,
      lastWatchedAt: new Date().toISOString(),
      lastWatchedItemId: itemId,
    };
    
    set(progressStateAtom, {
      ...currentState,
      lectureProgress: {
        ...currentState.lectureProgress,
        [lectureId]: updatedProgress,
      },
    });

    try {
      // 서버에 진도 업데이트
      const { error } = await supabase
        .from('lecture_progress')
        .upsert({
          user_id: user.id,
          lecture_id: lectureId,
          completed_items: newCompletedItems,
          total_items: progress.totalItems,
          progress_percentage: newProgressPercentage,
          last_watched_at: new Date().toISOString(),
          last_watched_item_id: progress.lastWatchedItemId,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('아이템 완료 처리 실패:', error);
      // 실패 시 롤백
      set(progressStateAtom, currentState);
      throw error;
    }
  }
);

// 마지막 시청 위치 업데이트
export const updateLastWatchedAtom = atom(
  null,
  async (get, set, lectureId: number, itemId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const currentState = get(progressStateAtom);
    const progress = currentState.lectureProgress[lectureId];
    
    if (!progress) {
      // 진도 정보가 없으면 먼저 조회
      try {
        await set(fetchLectureProgressAtom, lectureId);
      } catch (error) {
        console.error('진도 정보 조회 실패:', error);
      }
    }

    const updatedProgress = progress ? {
      ...progress,
      lastWatchedAt: new Date().toISOString(),
      lastWatchedItemId: itemId,
    } : null;

    if (updatedProgress) {
      // 낙관적 업데이트
      set(progressStateAtom, {
        ...currentState,
        lectureProgress: {
          ...currentState.lectureProgress,
          [lectureId]: updatedProgress,
        },
      });
    }

    try {
      // 서버에 마지막 시청 위치만 업데이트
      const { error } = await supabase
        .from('lecture_progress')
        .upsert({
          user_id: user.id,
          lecture_id: lectureId,
          last_watched_at: new Date().toISOString(),
          last_watched_item_id: itemId,
          // 기존 진도 정보가 있으면 유지
          ...(progress && {
            completed_items: progress.completedItems,
            total_items: progress.totalItems,
            progress_percentage: progress.progressPercentage,
          }),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('마지막 시청 위치 업데이트 실패:', error);
      // 실패해도 UI는 유지 (사용자 경험을 위해)
      return false;
    }
  }
);

// 강의 진도 초기화 (재수강 등)
export const resetLectureProgressAtom = atom(
  null,
  async (get, set, lectureId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const currentState = get(progressStateAtom);
    const progress = currentState.lectureProgress[lectureId];
    
    if (!progress) return true;

    // 낙관적 업데이트
    const resetProgress: LectureProgress = {
      ...progress,
      completedItems: [],
      progressPercentage: 0,
      lastWatchedAt: new Date().toISOString(),
      lastWatchedItemId: null,
    };
    
    set(progressStateAtom, {
      ...currentState,
      lectureProgress: {
        ...currentState.lectureProgress,
        [lectureId]: resetProgress,
      },
    });

    try {
      const { error } = await supabase
        .from('lecture_progress')
        .upsert({
          user_id: user.id,
          lecture_id: lectureId,
          completed_items: [],
          total_items: progress.totalItems,
          progress_percentage: 0,
          last_watched_at: new Date().toISOString(),
          last_watched_item_id: null,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('강의 진도 초기화 실패:', error);
      // 실패 시 롤백
      set(progressStateAtom, currentState);
      throw error;
    }
  }
);

// 특정 강의 진도 정보 조회
export const getLectureProgressAtom = atom((get) => (lectureId: number) => {
  const state = get(progressStateAtom);
  return state.lectureProgress[lectureId] || null;
});

// 아이템이 완료되었는지 확인
export const isItemCompletedAtom = atom((get) => (lectureId: number, itemId: number) => {
  const state = get(progressStateAtom);
  const progress = state.lectureProgress[lectureId];
  return progress ? progress.completedItems.includes(itemId) : false;
});

// 강의 완료 여부 확인 (모든 아이템 완료)
export const isLectureCompletedAtom = atom((get) => (lectureId: number) => {
  const state = get(progressStateAtom);
  const progress = state.lectureProgress[lectureId];
  
  if (!progress || progress.totalItems === 0) return false;
  return progress.completedItems.length === progress.totalItems;
});

// 다음 시청할 아이템 ID 조회
export const getNextItemToWatchAtom = atom((get) => (lectureId: number, allItemIds: number[]) => {
  const state = get(progressStateAtom);
  const progress = state.lectureProgress[lectureId];
  
  if (!progress) return allItemIds[0] || null;
  
  // 마지막 시청 아이템이 있으면 그 다음 아이템
  if (progress.lastWatchedItemId) {
    const lastIndex = allItemIds.indexOf(progress.lastWatchedItemId);
    if (lastIndex !== -1 && lastIndex < allItemIds.length - 1) {
      return allItemIds[lastIndex + 1];
    }
  }
  
  // 완료되지 않은 첫 번째 아이템
  const nextItem = allItemIds.find(itemId => !progress.completedItems.includes(itemId));
  return nextItem || null;
});

// 진도율 기준으로 정렬된 강의 목록 조회
export const getSortedLecturesByProgressAtom = atom((get) => () => {
  const state = get(progressStateAtom);
  
  return Object.entries(state.lectureProgress)
    .map(([lectureId, progress]) => ({
      lectureId: Number(lectureId),
      progress,
    }))
    .sort((a, b) => b.progress.progressPercentage - a.progress.progressPercentage);
});

// 전체 학습 통계 조회
export const getOverallProgressStatsAtom = atom((get) => {
  const state = get(progressStateAtom);
  
  const lectureCount = Object.keys(state.lectureProgress).length;
  let totalItems = 0;
  let completedItems = 0;
  let completedLectures = 0;
  
  Object.values(state.lectureProgress).forEach(progress => {
    totalItems += progress.totalItems;
    completedItems += progress.completedItems.length;
    
    if (progress.totalItems > 0 && progress.completedItems.length === progress.totalItems) {
      completedLectures++;
    }
  });
  
  const overallPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  return {
    lectureCount,
    completedLectures,
    totalItems,
    completedItems,
    overallPercentage,
  };
});

// 아이템 완료 취소 (실수로 완료한 경우)
export const unmarkItemCompletedAtom = atom(
  null,
  async (get, set, lectureId: number, itemId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const currentState = get(progressStateAtom);
    const progress = currentState.lectureProgress[lectureId];
    
    if (!progress || !progress.completedItems.includes(itemId)) {
      return true; // 이미 완료되지 않은 상태
    }

    // 낙관적 업데이트
    const newCompletedItems = progress.completedItems.filter(id => id !== itemId);
    const newProgressPercentage = Math.round((newCompletedItems.length / progress.totalItems) * 100);
    
    const updatedProgress: LectureProgress = {
      ...progress,
      completedItems: newCompletedItems,
      progressPercentage: newProgressPercentage,
      lastWatchedAt: new Date().toISOString(),
    };
    
    set(progressStateAtom, {
      ...currentState,
      lectureProgress: {
        ...currentState.lectureProgress,
        [lectureId]: updatedProgress,
      },
    });

    try {
      // 서버에 진도 업데이트
      const { error } = await supabase
        .from('lecture_progress')
        .upsert({
          user_id: user.id,
          lecture_id: lectureId,
          completed_items: newCompletedItems,
          total_items: progress.totalItems,
          progress_percentage: newProgressPercentage,
          last_watched_at: new Date().toISOString(),
          last_watched_item_id: itemId,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('아이템 완료 처리 실패:', error);
      // 실패 시 롤백
      set(progressStateAtom, currentState);
      throw error;
    }
  }
);