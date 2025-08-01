import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

// 수강 상태 타입 정의
export type EnrollmentStatus = 'active' | 'completed' | 'cancelled';

// 수강 상태 인터페이스
export interface EnrollmentState {
  enrolledLectures: Set<number>; // 수강중인 강의 ID들들
  enrollmentStatus: Record<number, EnrollmentStatus>; // 강의별 수강 상태
  lastWatchedItems: Record<number, number>; // 강의별 마지막 시청 아이템
  isLoading: boolean;
  lastFetched: number | null; // 마지막 조회 시간
}

// 기본 수강 상태
const enrollmentStateAtom = atom<EnrollmentState>({
  enrolledLectures: new Set<number>(),
  enrollmentStatus: {},
  lastWatchedItems: {},
  isLoading: false,
  lastFetched: null,
});

// 수강 상태 읽기 전용
export const enrollmentAtom = atom((get) => get(enrollmentStateAtom));

// 수강 상태 초기화 (로그인 시 호출)
export const initializeEnrollmentAtom = atom(
  null,
  async (get, set) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      set(enrollmentStateAtom, {
        enrolledLectures: new Set<number>(),
        enrollmentStatus: {},
        lastWatchedItems: {},
        isLoading: false,
        lastFetched: null,
      });
      return;
    }

    set(enrollmentStateAtom, (prev) => ({ ...prev, isLoading: true }));

    try {
      // 수강 정보 조회
      const { data: enrollments, error: enrollError } = await supabase
        .from('lecture_enrollments')
        .select('lecture_id, status')
        .eq('user_id', user.id);

      if (enrollError) throw enrollError;

      // 마지막 시청 위치 조회
      const { data: progress, error: progressError } = await supabase
        .from('lecture_progress')
        .select('lecture_id, last_watched_item_id')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // 데이터 가공
      const enrolledSet = new Set(enrollments?.map(item => item.lecture_id) || []);
      const statusMap = enrollments?.reduce((acc, item) => ({
        ...acc,
        [item.lecture_id]: item.status as EnrollmentStatus
      }), {}) || {};
      
      const lastWatchedMap = progress?.reduce((acc, item) => ({
        ...acc,
        [item.lecture_id]: item.last_watched_item_id
      }), {}) || {};
      
      set(enrollmentStateAtom, {
        enrolledLectures: enrolledSet,
        enrollmentStatus: statusMap,
        lastWatchedItems: lastWatchedMap,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error('수강 상태 초기화 실패:', error);
      set(enrollmentStateAtom, (prev) => ({ ...prev, isLoading: false }));
    }
  }
);

// 수강신청
export const enrollLectureAtom = atom(
  null,
  async (get, set, lectureId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const currentState = get(enrollmentStateAtom);

    // 낙관적 업데이트
    const newEnrolled = new Set(currentState.enrolledLectures);
    newEnrolled.add(lectureId);
    
    set(enrollmentStateAtom, {
      ...currentState,
      enrolledLectures: newEnrolled,
      enrollmentStatus: {
        ...currentState.enrollmentStatus,
        [lectureId]: 'active',
      },
    });

    try {
      const { error } = await supabase
        .from('lecture_enrollments')
        .insert({
          user_id: user.id,
          lecture_id: lectureId,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      // 실패 시 롤백
      set(enrollmentStateAtom, currentState);
      throw error;
    }
  }
);

// 수강 취소
export const cancelEnrollmentAtom = atom(
  null,
  async (get, set, lectureId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const currentState = get(enrollmentStateAtom);

    // 낙관적 업데이트
    const newEnrolled = new Set(currentState.enrolledLectures);
    newEnrolled.delete(lectureId);
    
    const newStatus = { ...currentState.enrollmentStatus };
    newStatus[lectureId] = 'cancelled';
    
    set(enrollmentStateAtom, {
      ...currentState,
      enrolledLectures: newEnrolled,
      enrollmentStatus: newStatus,
    });

    try {
      const { error } = await supabase
        .from('lecture_enrollments')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('lecture_id', lectureId);

      if (error) throw error;
      return true;
    } catch (error) {
      // 실패 시 롤백
      set(enrollmentStateAtom, currentState);
      throw error;
    }
  }
);

// 수강 완료 처리
export const completeLectureAtom = atom(
  null,
  async (get, set, lectureId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인 해주세요.');
    }

    const currentState = get(enrollmentStateAtom);

    // 낙관적 업데이트
    set(enrollmentStateAtom, {
      ...currentState,
      enrollmentStatus: {
        ...currentState.enrollmentStatus,
        [lectureId]: 'completed',
      },
    });

    try {
      const { error } = await supabase
        .from('lecture_enrollments')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('lecture_id', lectureId);

      if (error) throw error;
      return true;
    } catch (error) {
      // 실패 시 롤백
      set(enrollmentStateAtom, currentState);
      throw error;
    }
  }
);

// 마지막 시청 위치 업데이트
export const updateLastWatchedItemAtom = atom(
  null,
  async (get, set, lectureId: number, itemId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const currentState = get(enrollmentStateAtom);

    // 낙관적 업데이트
    set(enrollmentStateAtom, {
      ...currentState,
      lastWatchedItems: {
        ...currentState.lastWatchedItems,
        [lectureId]: itemId,
      },
    });

    try {
      // upsert 방식으로 업데이트 또는 생성
      const { error } = await supabase
        .from('lecture_progress')
        .upsert({
          user_id: user.id,
          lecture_id: lectureId,
          last_watched_item_id: itemId,
          last_watched_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('마지막 시청 위치 업데이트 실패:', error);
      // 실패해도 UI는 유지
      return false;
    }
  }
);

// 특정 강의 수강 상태 확인
export const getLectureEnrollmentStatusAtom = atom((get) => (lectureId: number) => {
  const state = get(enrollmentStateAtom);
  return {
    isEnrolled: state.enrolledLectures.has(lectureId),
    status: state.enrollmentStatus[lectureId] || null,
    lastWatchedItem: state.lastWatchedItems[lectureId] || null,
  };
});

// 수강중인 강의 목록 조회
export const getActiveEnrollmentAtom = atom((get) => {
  const state = get(enrollmentStateAtom);
  const activeEnrollments: number[] = [];

  state.enrolledLectures.forEach(lectureId => {
    if (state.enrollmentStatus[lectureId] = 'active') {
      activeEnrollments.push(lectureId);
    }
  });

  return activeEnrollments;
});

// 완료된 강의 목록 조회
export const getCompletedEnrollmentAtom = atom((get) => {
  const state = get(enrollmentStateAtom);
  const completedEnrollments: number[] = [];

  Object.entries(state.enrollmentStatus).forEach(([lectureId, status]) => {
    if (status === 'completed') {
      completedEnrollments.push(Number(lectureId));
    }
  });

  return completedEnrollments;
});

// 수강 통계 조회
export const getEnrollmentStatsAtom = atom((get) => {
  const state = get(enrollmentStateAtom);
  
  let active = 0;
  let completed = 0;
  let cancelled = 0;
  
  Object.values(state.enrollmentStatus).forEach(status => {
    switch (status) {
      case 'active': active++; break;
      case 'completed': completed++; break;
      case 'cancelled': cancelled++; break;
    }
  });
  
  return {
    total: state.enrolledLectures.size,
    active,
    completed,
    cancelled,
  };
});