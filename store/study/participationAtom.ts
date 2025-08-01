import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

interface ParticipationState {
  participatedStudies: Set<string>;
  participationStatus: Record<string, 'pending' | 'approved' | 'rejected'>;
  isLoading: boolean;
  lastFetched: number | null;
}

const participationStateAtom = atom<ParticipationState>({
  participatedStudies: new Set<string>(),
  participationStatus: {},
  isLoading: false,
  lastFetched: null,
});

// 참여 상태 읽기 전용
export const participationAtom = atom((get) => get(participationStateAtom));

// 참여 상태 초기화
export const initializeParticipationAtom = atom(
  null,
  async (get, set) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      set(participationStateAtom, {
        participatedStudies: new Set<string>(),
        participationStatus: {},
        isLoading: false,
        lastFetched: null,
      });
      return;
    }

    set(participationStateAtom, (prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase
        .from('study_participants')
        .select('study_id, status')
        .eq('user_id', user.id);

      if (error) throw error;

      const participatedSet = new Set(data?.map(item => item.study_id) || []);
      const statusMap = data?.reduce((acc, item) => ({
        ...acc,
        [item.study_id]: item.status
      }), {}) || {};
      
      set(participationStateAtom, {
        participatedStudies: participatedSet,
        participationStatus: statusMap,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error('참여 상태 초기화 실패:', error);
      set(participationStateAtom, (prev) => ({ ...prev, isLoading: false }));
    }
  }
);

// 참여 상태 업데이트
export const updateParticipationAtom = atom(
  null,
  (get, set, studyId: string, status: 'pending' | 'approved' | 'rejected' | null) => {
    const currentState = get(participationStateAtom);
    
    if (status === null) {
      // 참여 취소
      const newParticipated = new Set(currentState.participatedStudies);
      newParticipated.delete(studyId);
      
      const newStatus = { ...currentState.participationStatus };
      delete newStatus[studyId];
      
      set(participationStateAtom, {
        ...currentState,
        participatedStudies: newParticipated,
        participationStatus: newStatus,
      });
    } else {
      // 참여 상태 업데이트
      const newParticipated = new Set(currentState.participatedStudies);
      newParticipated.add(studyId);
      
      set(participationStateAtom, {
        ...currentState,
        participatedStudies: newParticipated,
        participationStatus: {
          ...currentState.participationStatus,
          [studyId]: status,
        },
      });
    }
  }
);

// 특정 스터디 참여 상태 확인
export const getParticipationStatusAtom = atom((get) => (studyId: string) => {
  const state = get(participationStateAtom);
  return {
    isParticipated: state.participatedStudies.has(studyId),
    status: state.participationStatus[studyId] || null,
  };
});