'use client';

import { userAtom } from './../../store/auth';
import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

// 타입 정의
interface Study {
  id: string;
  title: string;
  description: string;
  category: string;
  owner_id: string;
  owner_name: string;
  max_participants: number;
  current_participants: number;
  approved_participants: number;
  start_date: string;
  end_date: string;
  status: 'recruiting' | 'in_progress' | 'completed';
  location: string;
  is_online: boolean;
  book_id?: string;
  created_at: string;
  updated_at: string;
}

interface BookInfo {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
}

interface Participant {
  id: string;
  study_id: string;
  user_id: string;
  user_name: string;
  role: 'owner' | 'participant';
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
  last_active_at: string | null;
  avatar_url: string | null;
}

interface StudyDetails {
  study: Study;
  book: BookInfo | null;
  participants: Participant[];
  pendingParticipants: Participant[];
  approvedParticipants: Participant[];
  userParticipationStatus: 'not_joined' | 'pending' | 'approved' | 'rejected';
  isOwner: boolean;
}

// 쿼리 키 정의
export const studyKeys = {
  all: ['studies'] as const,
  lists: () => [...studyKeys.all, 'list'] as const,
  list: (filters: string) => [...studyKeys.lists(), filters] as const,
  details: () => [...studyKeys.all, 'detail'] as const,
  detail: (id: string) => [...studyKeys.details(), id] as const,
  participants: (studyId: string) => [...studyKeys.all, 'participants', studyId] as const,
};

// 1. 스터디 상세 정보 조회 (모든 데이터 한 번에)
export const useStudyDetails = (studyId: string) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: studyKeys.detail(studyId),
    queryFn: async (): Promise<StudyDetails> => {
      const supabase = await createClient();

      try {
        // 1. 스터디 기본 정보 조회
        const { data: studyData, error: studyError } = await supabase
          .from('studies')
          .select('*')
          .eq('id', studyId)
          .single();

        if (studyError) throw studyError;
        if (!studyData) throw new Error('스터디를 찾을 수 없습니다.');

        // 2. 도서 정보 조회
        let bookData: BookInfo | null = null;
        if (studyData.book_id) {
          const { data, error } = await supabase
            .from('books')
            .select('id, title, author, cover_url')
            .eq('id', studyData.book_id)
            .single();

          if (!error && data) {
            bookData = data;
          }
        }

        // 3. 참여자 정보 조회 - 조인 방식 변경
        const { data: participantsData, error: participantsError } = await supabase
          .from('study_participants')
          .select('*')
          .eq('study_id', studyId)
          .order('joined_at', { ascending: true });

        if (participantsError) throw participantsError;

        // 4. 참여자들의 프로필 정보 별도 조회
        let participants: Participant[] = [];
        if (participantsData && participantsData.length > 0) {
          // 사용자 ID 목록 추출
          const userIds = [...new Set(participantsData.map(p => p.user_id))];

          // 프로필 정보 별도 조회
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, nickname, avatar_url')
            .in('id', userIds);

          if (profilesError) {
            console.warn('프로필 조회 실패:', profilesError);
          }

          // 프로필 정보 맵 생성
          const profileMap = new Map(
            profilesData?.map(profile => [profile.id, profile]) || []
          );

          // 참여자 데이터와 프로필 정보 병합
          participants = participantsData.map(participant => {
            const profile = profileMap.get(participant.user_id);
            return {
              ...participant,
              user_name: profile?.nickname || profile?.name || participant.user_name || '사용자',
              avatar_url: profile?.avatar_url 
                ? `https://hcqusfewtyxmpdvzpeor.supabase.co/storage/v1/object/public/avatars/${profile.avatar_url}`
                : null,
            };
          });
        }

        // 5. 참여자 분류 - 안전한 접근
        const pendingParticipants = participants.filter(p => p.status === 'pending');
        const approvedParticipants = participants.filter(p => 
          p.status === 'approved' || (!p.status && p.role === 'owner') // 방장은 자동 승인으로 간주
        );

        // 6. 사용자 참여 상태 확인
        let userParticipationStatus: 'not_joined' | 'pending' | 'approved' | 'rejected' = 'not_joined';
        if (user) {
          const userParticipation = participants.find(p => p.user_id === user.id);
          if (userParticipation) {
            // 방장인 경우 자동으로 approved 처리
            if (userParticipation.role === 'owner') {
              userParticipationStatus = 'approved';
            } else {
              userParticipationStatus = userParticipation.status || 'approved';
            }
          }
        }

        // 7. 소유자 여부 확인
        const isOwner = user?.id === studyData.owner_id;

        return {
          study: studyData,
          book: bookData,
          participants,
          pendingParticipants,
          approvedParticipants,
          userParticipationStatus,
          isOwner,
        };

      } catch (error) {
        console.error('스터디 상세 조회 에러:', error);
        throw error;
      }
    },
    enabled: !!studyId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      // 400 에러는 재시도하지 않음
      if (error?.message?.includes('400')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// 2. 스터디 참여 신청
export const useJoinStudy = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ studyId, userName }: { studyId: string; userName: string }) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();
      const now = new Date().toISOString();

      // 참여자 추가
      const { data: newParticipant, error } = await supabase
        .from('study_participants')
        .insert({
          study_id: studyId,
          user_id: user.id,
          user_name: userName,
          role: 'participant',
          status: 'pending',
          joined_at: now,
          last_active_at: now,
        })
        .select()
        .single();

      if (error) throw error;
      return newParticipant;
    },
    onMutate: async ({ studyId }) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: studyKeys.detail(studyId) });

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData<StudyDetails>(studyKeys.detail(studyId));

      // 낙관적 업데이트
      if (previousData && user) {
        const newParticipant: Participant = {
          id: `temp_${Date.now()}`,
          study_id: studyId,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email || '사용자',
          role: 'participant',
          status: 'pending',
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          avatar_url: null,
        };

        queryClient.setQueryData<StudyDetails>(studyKeys.detail(studyId), {
          ...previousData,
          study: {
            ...previousData.study,
            current_participants: previousData.study.current_participants + 1,
          },
          participants: [...previousData.participants, newParticipant],
          pendingParticipants: [...previousData.pendingParticipants, newParticipant],
          userParticipationStatus: 'pending',
        });
      }

      return { previousData };
    },
    onError: (error, { studyId }, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousData) {
        queryClient.setQueryData(studyKeys.detail(studyId), context.previousData);
      }
      showToast('스터디 참여 신청에 실패했습니다.', 'error');
    },
    onSuccess: (data, { studyId }) => {
      showToast('스터디 참여 신청이 완료되었습니다. 승인을 기다려주세요.', 'success');

      // 관련 쿼리 무효화하여 최신 데이터로 업데이트
      queryClient.invalidateQueries({ queryKey: studyKeys.detail(studyId) });
      queryClient.invalidateQueries({ queryKey: studyKeys.lists() });
    },
  });
};

// 3. 참여자 승인/거부 (스터디 개설자)
export const useUpdateParticipantStatus = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      studyId,
      participantId,
      status
    }: {
      studyId: string;
      participantId: string;
      status: 'approved' | 'rejected';
    }) => {
      const supabase = createClient();

      const { error } = await supabase
        .from('study_participants')
        .update({
          status,
          last_active_at: new Date().toISOString(),
        })
        .eq('id', participantId)
        .eq('study_id', studyId);

      if (error) throw error;

      return { participantId, status };
    },
    onMutate: async ({ studyId, participantId, status }) => {
      await queryClient.cancelQueries({ queryKey: studyKeys.detail(studyId) });

      const previousData = queryClient.getQueryData<StudyDetails>(studyKeys.detail(studyId));

      if (previousData) {
        const updatedParticipants = previousData.participants.map(p =>
          p.id === participantId ? { ...p, status } : p
        );

        const pendingParticipants = updatedParticipants.filter(p => p.status === 'pending');
        const approvedParticipants = updatedParticipants.filter(p => p.status === 'approved');

        queryClient.setQueryData<StudyDetails>(studyKeys.detail(studyId), {
          ...previousData,
          study: {
            ...previousData.study,
            approved_participants: approvedParticipants.length,
          },
          participants: updatedParticipants,
          pendingParticipants,
          approvedParticipants,
        });
      }

      return { previousData };
    },
    onError: (error, { studyId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(studyKeys.detail(studyId), context.previousData);
      }
      showToast('참여자 상태 변경에 실패했습니다.', 'error');
    },
    onSuccess: (data, { studyId }) => {
      const message = data.status === 'approved' ? '참여자를 승인했습니다.' : '참여자를 거부했습니다.';
      showToast(message, 'success');

      queryClient.invalidateQueries({ queryKey: studyKeys.detail(studyId) });
    },
  });
};

// 4. 스터디 상태 변경 (모집중 -> 진행중 -> 완료)
export const useUpdateStudyStatus = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      studyId,
      status
    }: {
      studyId: string;
      status: 'recruiting' | 'in_progress' | 'completed';
    }) => {
      const supabase = createClient();

      const { error } = await supabase
        .from('studies')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studyId);
      
      if (error) throw error;
      return { studyId, status };
    },
    onMutate: async ({ studyId, status }) => {
      await queryClient.cancelQueries({ queryKey: studyKeys.detail(studyId) });

      const previousData = queryClient.getQueryData<StudyDetails>(studyKeys.detail(studyId));

      if (previousData) {
        queryClient.setQueryData<StudyDetails>(studyKeys.detail(studyId), {
          ...previousData,
          study: {
            ...previousData.study,
            status,
          },
        });
      }

      return { previousData };
    },
    onError: (error, { studyId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(studyKeys.detail(studyId), context.previousData);
      }
      showToast('스터디 상태 변경에 실패했습니다.', 'error');
    },
    onSuccess: (data) => {
      const statusText = {
        recruiting: '모집중',
        in_progress: '진행중',
        completed: '완료',
      }[data.status];

      showToast(`스터디 상태가 ${statusText}로 변경되었습니다.`, 'success');

      queryClient.invalidateQueries({ queryKey: studyKeys.detail(data.studyId) });
      queryClient.invalidateQueries({ queryKey: studyKeys.lists() });
    },
  });
};

// 5. 사용자의 스터디 목록 조회
export const useMyStudies = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: ['my-studies', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const supabase = createClient();

      // 사용자가 참여 중인 스터디 ID와 역할 조회
      const { data: participantData, error: participantError } = await supabase
        .from('study_participants')
        .select('study_id, role, status, last_active_at')
        .eq('user_id', user.id)

      if (participantError) throw participantError;
      if (!participantData || participantData.length === 0) return [];

      const studyIds = participantData.map(p => p.study_id);

      // 스터디 상세 정보 조회
      const { data: studiesData, error: studiesError } = await supabase
        .from('studies')
        .select(`
          *,
          books:book_id (
            id,
            title
          )
        `)
        .in('id', studyIds);

      if (studiesError) throw studiesError;
      if (!studiesData) return [];

      // 스터디와 참여 정보 병합
      return studiesData.map(study => {
        const participantInfo = participantData.find(p => p.study_id === study.id);
        return {
          ...study,
          participant: participantInfo?.role,
          participant_status: participantInfo?.status,
          last_active_at: participantInfo?.last_active_at,
          book_title: study.books?.title || null,
        };
      });
    },
    enabled: !!user,
    staleTime: 5 * 30 * 1000,
  });
};

// 6. 스터디 나가기/해체
export const useLeaveStudy = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ studyId, isOwner }: { studyId: string; isOwner: boolean }) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      if (isOwner) {
        // 방장인 경우: 스터디 해체
        const { error } = await supabase.rpc('delete_study', {
          p_study_id: studyId,
          p_owner_id: user.id,
        });
        if (error) throw error;
        return { action: 'dissolve' as const };
      } else {
        // 일반 참여자: 나가기
        const { error } = await supabase
          .from('study_participants')
          .delete()
          .eq('study_id', studyId)
          .eq('user_id', user.id);

        if (error) throw error;
        return { action: 'leave' as const };
      }
    },
    onSuccess: (data) => {
      const message = data.action === 'dissolve' ? '스터디를 해체했습니다.' : '스터디를 나갔습니다.';
      showToast(message, 'success');

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: studyKeys.all });
    },
  });
};

// 7. 참여자 강퇴
export const useKickParticipant = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      studyId,
      participantId,
    }: {
      studyId: string;
      participantId: string;
    }) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();
      const { data: success, error } =await supabase.rpc('kick_study_participant', {
        p_study_id: studyId,
        p_owner_id: user.id,
        p_participant_id: participantId,
      });

      if (error) throw error;
      if (!success) throw new Error('강퇴 권한이 없습니다.');

      return { participantId };
    },
    onMutate: async ({ studyId, participantId }) => {
      await queryClient.cancelQueries({ queryKey: studyKeys.detail(studyId) });

      const previousData = queryClient.getQueryData<StudyDetails>(studyKeys.detail(studyId));
    
      if (previousData) {
        const updatedParticipants = previousData.participants.filter(p => p.user_id !== participantId);
        const approvedParticipants = updatedParticipants.filter(p => p.status === 'approved');

        queryClient.setQueryData<StudyDetails>(studyKeys.detail(studyId), {
          ...previousData,
          study: {
            ...previousData.study,
            current_participants: Math.max(0, previousData.study.current_participants - 1),
            approved_participants: approvedParticipants.length,
          },
          participants: updatedParticipants,
          approvedParticipants,
          pendingParticipants: updatedParticipants.filter(p => p.status === 'pending'),
        });
      }

      return { previousData };
    },
    onError: (error, { studyId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(studyKeys.detail(studyId), context.previousData);
      }
      showToast('강퇴 처리에 실패했습니다.', 'error');
    },
    onSuccess: (data, { studyId }) => {
      showToast('강퇴했습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: studyKeys.detail(studyId) });
    },
  });
};

// 스터디 삭제
export const useDeleteStudy = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ studyId }: { studyId: string }) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();
      const { data: success, error } = await supabase.rpc('delete_study', {
        p_study_id: studyId,
        p_owner_id: user.id,
      });

      if (error) throw error;
      if (!success) throw new Error('삭제 권한이 없습니다.');

      return { studyId };
    },
    onSuccess: (data) => {
      showToast('스터디가 성공적으로 삭제되었습니다.', 'success');

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: studyKeys.all });
      queryClient.removeQueries({ queryKey: studyKeys.detail(data.studyId) });
    },
    onError: () => {
      showToast('스터디 삭제 중 오류가 발생했습니다.', 'error');
    },
  });
};