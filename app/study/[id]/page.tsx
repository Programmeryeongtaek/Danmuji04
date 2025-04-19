'use client';

import { useToast } from '@/components/common/Toast/Context';
import ChatRoom from '@/components/study/ChatRoom';
import ShareButton from '@/components/study/ShareButton';
import StudyEditForm from '@/components/study/StudyEditForm';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { useAtomValue } from 'jotai';
import {
  ArrowLeft,
  Book,
  CalendarClock,
  CheckCircle,
  Clock,
  Edit2,
  Globe,
  MapPin,
  MessageCircle,
  Shield,
  Trash2,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

// 스터디 상세 정보 타입
interface Study {
  id: string;
  title: string;
  description: string;
  category: string;
  owner_id: string;
  owner_name: string;
  max_participants: number;
  current_participants: number;
  approved_participants: number; // 확정된 인원
  start_date: string;
  end_date: string;
  location: string;
  is_online: boolean;
  status: 'recruiting' | 'in_progress' | 'completed';
  created_at: string;
  book_id?: string | null;
}

// 도서 정보 타입
interface BookInfo {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
}

// 참여자 정보 타입
interface Participant {
  id: string;
  study_id: string;
  user_id: string;
  user_name: string;
  role: 'owner' | 'participant';
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
  avatar_url?: string | null;
  last_active_at?: string | null;
}

// 스터디 수정 폼 데이터 타입
interface StudyFormData {
  title: string;
  description: string;
  max_participants: number;
  start_date: string;
  end_date: string;
  location: string;
  is_online: boolean;
}

export default function StudyDetailPage() {
  const [study, setStudy] = useState<Study | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pendingParticipants, setPendingParticipants] = useState<Participant[]>(
    []
  );
  const [approvedParticipants, setApprovedParticipants] = useState<
    Participant[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('info');

  const router = useRouter();
  const { showToast } = useToast();
  const user = useAtomValue(userAtom);
  const params = useParams();
  const studyId = params.id as string;

  // 참여 상태만 빠르게 확인하는 별도 함수
  const checkParticipationStatus = useCallback(async () => {
    if (!user || !studyId) return;

    try {
      const supabase = createClient();

      // 사용자의 참여 여부만 빠르게 확인
      const { data, error } = await supabase
        .from('study_participants')
        .select('id, status')
        .eq('study_id', studyId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('참여 상태 확인 오류:', error);
        return;
      }

      // 참여 상태 설정 (null이 아니면 참여 중)
      setIsParticipant(!!data);
    } catch (error) {
      console.error('참여 상태 확인 중 오류:', error);
    }
  }, [studyId, user]);

  // 스터디 상태 변경
  const handleChangeStudyStatus = async (
    newStatus: 'recruiting' | 'in_progress' | 'completed'
  ) => {
    if (!user || !study) return;

    // 방장 권한 확인
    if (study.owner_id !== user.id) {
      showToast('스터디 방장만 상태를 변경할 수 있습니다.', 'error');
      return;
    }

    // 완료 상태에서는 변경 불가
    if (study.status === 'completed') {
      showToast('완료된 스터디의 상태는 변경할 수 없습니다.', 'error');
      return;
    }

    // 완료로 변경시 최종 확인
    if (
      newStatus === 'completed' &&
      !confirm(
        '완료 상태를 선택하면, 스터디 상태를 변경할 수 없습니다. 계속하시겠습니까?'
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('studies')
        .update({ status: newStatus })
        .eq('id', studyId);

      if (error) throw error;

      setStudy({
        ...study,
        status: newStatus,
      });

      showToast(
        `스터디 상태가 ${newStatus === 'recruiting' ? '모집 중' : newStatus === 'in_progress' ? '진행 중' : '완료'}(으)로 변경되었습니다.`,
        'success'
      );
    } catch (error) {
      console.error('스터디 상태 변경 중 오류:', error);
      showToast('상태 변경에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 스터디 정보 및 참여자 정보 가져오기
  const fetchStudyDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // 스터디 기본 정보 및 참여자 수 동기화
      await fetchAndSyncStudyData(supabase);

      // 연결된 도서 정보 가져오기
      if (study?.book_id) {
        await fetchBookInfo(supabase, study.book_id);
      }

      // 참여자 정보 가져오기 및 프로필 정보 처리
      await fetchParticipantsData(supabase);
    } catch (error) {
      console.error('스터디 정보 로딩 중 오류:', error);
      showToast('스터디 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [study?.book_id, showToast]);

  useEffect(() => {
    if (studyId && user) {
      // 페이지 로드 시 즉시 참여 여부 확인
      checkParticipationStatus();
      // 전체 스터디 정보 로드
      fetchStudyDetails();
    } else {
      // 로그인하지 않은 경우에는 스터디 정보만 로드
      fetchStudyDetails();
    }
  }, [studyId, user, checkParticipationStatus, fetchStudyDetails]);

  // 참여자 데이터 로드 후 분류
  useEffect(() => {
    const pending = participants.filter((p) => p.status === 'pending');
    const approved = participants.filter((p) => p.status === 'approved');

    setPendingParticipants(pending);
    setApprovedParticipants(approved);
  }, [participants]);

  // 스터디 기본 정보 가져오기 및 참여자 수 동기화
  const fetchAndSyncStudyData = async (supabase: SupabaseClient) => {
    // 스터디 정보 가져오기
    const { data: studyData, error: studyError } = await supabase
      .from('studies')
      .select('*')
      .eq('id', studyId)
      .single();

    if (studyError) {
      console.error('스터디 정보 조회 오류:', studyError);
      throw studyError;
    }

    // 참여자 수 및 승인 참여자 수 동기화
    const { data: allParticipants, error: participantsError } = await supabase
      .from('study_participants')
      .select('status')
      .eq('study_id', studyId);

    if (!participantsError && allParticipants) {
      const totalCount = allParticipants.length;
      const approvedCount = allParticipants.filter(
        (p) => p.status === 'approved'
      ).length;

      // 실제 참여자 수와 DB의 값이 다른 경우 업데이트
      if (
        totalCount !== studyData.current_participants ||
        approvedCount !== studyData.approved_participants
      ) {
        const updatedStudyData = {
          ...studyData,
          current_participants: totalCount,
          approved_participants: approvedCount,
        };

        // DB 업데이트
        await supabase
          .from('studies')
          .update({
            current_participants: totalCount,
            approved_participants: approvedCount,
          })
          .eq('id', studyId);

        setStudy(updatedStudyData);
      } else {
        setStudy(studyData);
      }
    } else {
      setStudy(studyData);
    }
  };

  // 도서 정보 가져오기
  const fetchBookInfo = async (supabase: SupabaseClient, bookId: string) => {
    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .select('id, title, author, cover_url')
      .eq('id', bookId)
      .single();

    if (bookError) {
      console.error('도서 정보 조회 오류:', bookError);
    } else {
      setBookInfo(bookData);
    }
  };

  // 참여자 정보 가져오기 및 처리
  const fetchParticipantsData = async (supabase: SupabaseClient) => {
    // 참여자 목록 조회
    const { data: participantsData, error: participantsError } = await supabase
      .from('study_participants')
      .select('*')
      .eq('study_id', studyId)
      .order('joined_at', { ascending: true });

    if (participantsError) {
      console.error('참여자 정보 조회 오류:', participantsError);
      throw participantsError;
    }

    // 현재 로그인한 사용자가 참여자인지 체크
    if (user) {
      const isUserParticipating = participantsData.some(
        (p) => p.user_id === user.id
      );
      setIsParticipant(isUserParticipating);
    }

    // 참여자 프로필 이미지 가져오기
    const enhancedParticipants = await Promise.all(
      participantsData.map(async (participant) => {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', participant.user_id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('프로필 정보 조회 오류:', profileError);
          }

          let avatarUrl = null;
          if (profileData?.avatar_url) {
            const {
              data: { publicUrl },
            } = supabase.storage
              .from('avatars')
              .getPublicUrl(profileData.avatar_url);
            avatarUrl = publicUrl;
          }

          return {
            ...participant,
            avatar_url: avatarUrl,
          };
        } catch (error) {
          console.error('참여자 프로필 처리 오류:', error);
          return {
            ...participant,
            avatar_url: null,
          };
        }
      })
    );

    setParticipants(enhancedParticipants);
  };

  const handleJoinStudy = async () => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
      return;
    }

    if (!study) {
      showToast('스터디 정보를 불러올 수 없습니다.', 'error');
      return;
    }

    if (study.status !== 'recruiting') {
      showToast('모집이 마감된 스터디입니다.', 'error');
      return;
    }

    if (study.current_participants >= study.max_participants * 2) {
      showToast('신청 가능 인원이 가득 찼습니다.', 'error');
      return;
    }

    setIsJoining(true);

    try {
      const supabase = createClient();

      // 1. 이미 신청했는지 명시적으로 확인 (중요)
      const { data: existingParticipant, error: checkError } = await supabase
        .from('study_participants')
        .select('id, status')
        .eq('study_id', studyId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('참여자 확인 중 오류:', checkError);
        throw checkError;
      }

      // 이미 신청했거나 참여 중인 경우
      if (existingParticipant) {
        // 이미 승인된 경우
        if (existingParticipant.status === 'approved') {
          setIsParticipant(true);
          showToast('이미 참여 중인 스터디입니다.', 'info');
          setIsJoining(false);
          return;
        }

        // 대기 중인 경우
        if (existingParticipant.status === 'pending') {
          setIsParticipant(true);
          showToast(
            '이미 참여 신청한 스터디입니다. 승인을 기다려주세요.',
            'info'
          );
          setIsJoining(false);
          return;
        }

        // 거절된 경우 - 재신청 가능
        if (existingParticipant.status === 'rejected') {
          // 기존 참여 정보 삭제
          const { error: deleteError } = await supabase
            .from('study_participants')
            .delete()
            .eq('id', existingParticipant.id);

          if (deleteError) {
            console.error('이전 참여 정보 삭제 실패:', deleteError);
            throw deleteError;
          }

          // 계속해서 새 참여 신청 진행
        }
      }

      // 2. 사용자 정보 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('프로필 정보 조회 중 오류:', profileError);
      }

      const userName =
        profile?.nickname || profile?.name || user.email || '익명';

      // 3. 트랜잭션 처리
      // 참가자 추가 및 현재 참여자 수 업데이트를 트랜잭션으로 처리
      const now = new Date().toISOString();

      // 3.1 참여자 추가
      const { data: newParticipant, error: participantError } = await supabase
        .from('study_participants')
        .insert({
          study_id: studyId,
          user_id: user.id,
          user_name: userName,
          role: 'participant',
          status: 'pending', // 대기 상태로 설정
          joined_at: now,
          last_active_at: now,
        })
        .select()
        .single();

      if (participantError) {
        console.error('참여자 등록 중 오류:', participantError);
        throw participantError;
      }

      // 3.2 현재 참여자 수 업데이트
      const { data: studyData, error: fetchError } = await supabase
        .from('studies')
        .select('current_participants')
        .eq('id', studyId)
        .single();

      if (fetchError) {
        console.error('스터디 정보 조회 오류:', fetchError);
        throw fetchError;
      }

      const newParticipantCount = (studyData?.current_participants || 0) + 1;

      const { error: updateError } = await supabase
        .from('studies')
        .update({
          current_participants: newParticipantCount,
        })
        .eq('id', studyId);

      if (updateError) {
        console.error('스터디 정보 업데이트 중 오류:', updateError);
        throw updateError;
      }

      // 4. UI 및 상태 업데이트
      showToast(
        '스터디 참여 신청이 완료되었습니다. 승인을 기다려주세요.',
        'success'
      );
      setIsParticipant(true);

      // study 상태 즉시 업데이트
      setStudy({
        ...study,
        current_participants: newParticipantCount,
      });

      // 참여자 목록에 추가
      setParticipants((prev) => [
        ...prev,
        {
          ...newParticipant,
          avatar_url: null,
        },
      ]);

      // 새로고침하여 최신 데이터 가져오기
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('스터디 참여 중 오류 발생:', error);
      showToast('스터디 참여에 실패했습니다.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  // 참여 신청 승인
  const handleApproveParticipant = async (
    participantId: string,
    participantName: string
  ) => {
    if (!user || !study) return;

    try {
      const supabase = createClient();

      const { data: success, error } = await supabase.rpc(
        'approve_study_participant',
        {
          p_study_id: studyId,
          p_owner_id: user.id,
          p_participant_id: participantId,
        }
      );

      if (error) throw error;

      if (!success) {
        showToast(
          '승인에 실패했습니다. 정원이 가득 찼거나 권한이 없을 수 있습니다.',
          'error'
        );
        return;
      }

      // UI 업데이트 - Type 문제 해결
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.user_id === participantId) {
            return {
              ...p,
              status: 'approved' as const,
            };
          }
          return p;
        })
      );

      // 승인된 인원 카운트 업데이트
      if (study.approved_participants < study.max_participants) {
        setStudy({
          ...study,
          approved_participants: study.approved_participants + 1,
          // 확정 인원이 최대에 도달하면 모집 종료
          status:
            study.approved_participants + 1 >= study.max_participants
              ? 'in_progress'
              : study.status,
        });
      }

      showToast(`${participantName} 님의 참여를 승인했습니다.`, 'success');
    } catch (error) {
      console.error('참여 승인 중 오류:', error);
      showToast('승인 처리에 실패했습니다.', 'error');
    }
  };

  // 참여 신청 거절 함수
  const handleRejectParticipant = async (
    participantId: string,
    participantName: string
  ) => {
    if (!user || !study) return;

    try {
      const supabase = createClient();

      const { data: success, error } = await supabase.rpc(
        'reject_study_participant',
        {
          p_study_id: studyId,
          p_owner_id: user.id,
          p_participant_id: participantId,
        }
      );

      if (error) throw error;

      if (!success) {
        showToast(
          '거절에 실패했습니다. 권한이 없거나 이미 처리되었을 수 있습니다.',
          'error'
        );
        return;
      }

      // UI 업데이트
      const updatedParticipants = participants.map((p) => {
        if (p.user_id === participantId) {
          const updated: Participant = {
            ...p,
            status: 'rejected' as const,
          };
          return updated;
        }
        return p;
      });

      setParticipants(updatedParticipants);

      // 참여자 수 감소
      setStudy({
        ...study,
        current_participants: Math.max(0, study.current_participants - 1),
      });

      showToast(`${participantName} 님의 참여를 거절했습니다.`, 'success');
    } catch (error) {
      console.error('참여 거절 중 오류:', error);
      showToast('거절 처리에 실패했습니다.', 'error');
    }
  };

  // 강퇴 처리 함수
  const handleKickParticipant = async (
    participantId: string,
    participantName: string
  ) => {
    if (!user || !study) return;

    // 방장 권한 확인
    if (study.owner_id !== user.id) {
      showToast('방장만 참여자를 강퇴할 수 있습니다.', 'error');
      return;
    }

    // 강퇴 확인 메시지
    if (!confirm(`정말로 ${participantName}님을 강퇴하시겠습니까?`)) return;

    try {
      setIsLoading(true);
      const supabase = createClient();

      // RPC 함수 호출
      const { data: success, error } = await supabase.rpc(
        'kick_study_participant',
        {
          p_study_id: studyId,
          p_owner_id: user.id,
          p_participant_id: participantId,
        }
      );

      if (error) {
        console.error('참여자 강퇴 중 오류:', error);
        throw error;
      }

      if (!success) {
        showToast('강퇴 권한이 없거나 처리 중 문제가 발생했습니다.', 'error');
        return;
      }

      // UI 상태 업데이트
      setParticipants((prev) =>
        prev.filter((p) => p.user_id !== participantId)
      );

      // 스터디 상태 업데이트 (참여자 수 감소)
      setStudy((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_participants: Math.max(0, prev.current_participants - 1),
          approved_participants: Math.max(0, prev.approved_participants - 1),
        };
      });

      showToast(`${participantName} 님을 강퇴했습니다.`, 'success');
    } catch (error) {
      console.error('강퇴 처리 중 오류:', error);
      showToast('강퇴 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 스터디 나가기 및 해체 함수 개선
  const handleLeaveStudy = async () => {
    if (!user || !study) return;

    const isOwner = study.owner_id === user.id;
    const actionText = isOwner ? '해체' : '나가기';

    // 방장 권한 확인
    if (study.owner_id !== user.id) {
      showToast('스터디 방장만 해체할 수 있습니다.', 'error');
      return;
    }

    // 모집중 상태만 해체 가능
    if (study.status !== 'recruiting') {
      showToast('진행 중이거나 완료된 스터디는 해체할 수 없습니다.', 'error');
      return;
    }

    // 확인 메시지 표시
    if (!confirm(`정말로 스터디를 ${actionText}하시겠습니까?`)) return;

    // 중복 실행 방지
    if (isLeaving) return;
    setIsLeaving(true);

    try {
      setIsLoading(true);
      const supabase = createClient();

      if (isOwner) {
        // 방장인 경우: 스터디 해체 (모든 참여자 제거 + 상태 변경)
        try {
          // 1. 스터디 상태 변경 (먼저 수행)
          const { error: updateStudyError } = await supabase
            .from('studies')
            .update({
              status: 'completed',
              current_participants: 0,
              approved_participants: 0,
            })
            .eq('id', studyId);

          if (updateStudyError) {
            console.error('스터디 상태 업데이트 오류:', updateStudyError);
          }

          // 2. 모든 참여자 제거 (hard delete 시도)
          const { error: deleteParticipantsError } = await supabase
            .from('study_participants')
            .delete()
            .eq('study_id', studyId);

          if (deleteParticipantsError) {
            console.error('참여자 삭제 오류:', deleteParticipantsError);
          }

          // 3. 채팅 메시지 삭제
          const { error: deleteChatError } = await supabase
            .from('study_chat_messages')
            .delete()
            .eq('study_id', studyId);

          if (deleteChatError) {
            console.error('채팅 메시지 삭제 오류:', deleteChatError);
          }

          // 4. 스터디 삭제
          const { error: deleteStudyError } = await supabase
            .from('studies')
            .delete()
            .eq('id', studyId);

          if (deleteStudyError) throw deleteStudyError;

          showToast('스터디가 해체되었습니다.', 'success');

          // 지연 후 리다이렉트
          setTimeout(() => {
            router.push('/study');
          }, 1000);
        } catch (innerError) {
          console.error('스터디 해체 과정 중 오류:', innerError);
          showToast('스터디 해체 과정에서 문제가 발생했습니다.', 'error');
        }
      } else {
        // 일반 참여자인 경우: 참여자 삭제에 여러 번 시도
        try {
          // 1. 현재 사용자 상태 확인
          const { data: participant } = await supabase
            .from('study_participants')
            .select('status')
            .eq('study_id', studyId)
            .eq('user_id', user.id)
            .single();

          const wasApproved = participant?.status === 'approved';

          // 2. hard delete 시도
          for (let attempt = 0; attempt < 3; attempt++) {
            const { error: deleteError } = await supabase
              .from('study_participants')
              .delete()
              .eq('study_id', studyId)
              .eq('user_id', user.id);

            if (!deleteError) {
              console.log(`나가기 성공: ${attempt + 1}번째 시도`);
              break; // 성공하면 반복 중단
            } else {
              console.error(`나가기 시도 ${attempt + 1} 실패:`, deleteError);
              // 실패하면 잠시 대기 후 재시도
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          // 3. 참여자 수 업데이트
          const { data: currentStudy } = await supabase
            .from('studies')
            .select('current_participants, approved_participants')
            .eq('id', studyId)
            .single();

          if (currentStudy) {
            const newCount = Math.max(0, currentStudy.current_participants - 1);
            const newApprovedCount = wasApproved
              ? Math.max(0, currentStudy.approved_participants - 1)
              : currentStudy.approved_participants;

            await supabase
              .from('studies')
              .update({
                current_participants: newCount,
                approved_participants: newApprovedCount,
              })
              .eq('id', studyId);
          }

          // 4. UI 상태 업데이트 (DB 작업 결과와 무관하게)
          setParticipants((prev) => prev.filter((p) => p.user_id !== user.id));
          setIsParticipant(false);

          setStudy((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              current_participants: Math.max(0, prev.current_participants - 1),
              approved_participants: wasApproved
                ? Math.max(0, prev.approved_participants - 1)
                : prev.approved_participants,
            };
          });

          showToast('스터디에서 나갔습니다.', 'success');

          // 5. 페이지 리다이렉트
          setTimeout(() => {
            router.push('/study');
          }, 1000);
        } catch (error) {
          console.error('스터디 나가기 처리 중 오류:', error);

          // 오류가 발생해도 UI에서 나간 것처럼 처리
          setParticipants((prev) => prev.filter((p) => p.user_id !== user.id));
          setIsParticipant(false);
          showToast('오류가 발생했으나 나가기 처리는 완료되었습니다.', 'error');

          // 오류가 발생해도 리다이렉트
          setTimeout(() => {
            router.push('/study');
          }, 1000);
        }
      }
    } catch (error) {
      console.error(`스터디 ${isOwner ? '해체' : '나가기'} 오류:`, error);
      showToast(
        `스터디 ${isOwner ? '해체' : '나가기'}에 실패했습니다.`,
        'error'
      );

      // 심각한 오류 발생 시에도 리다이렉트
      setTimeout(() => {
        router.push('/study');
      }, 1000);
    } finally {
      setIsLoading(false);
      setIsLeaving(false);
    }
  };

  // 스터디 삭제
  const handleDeleteStudy = async () => {
    if (!user || !study) return;

    // 방장 권한 확인
    if (study.owner_id !== user.id) {
      showToast('스터디 방장만 삭제할 수 있습니다.', 'error');
      return;
    }

    // 삭제 확인
    if (
      !confirm(
        '정말로 스터디를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      // RPC 함수 호출
      const { data: success, error } = await supabase.rpc('delete_study', {
        p_study_id: studyId,
        p_owner_id: user.id,
      });

      if (error) throw error;

      if (!success) {
        showToast(
          '스터디 삭제 권한이 없거나 처리 중 문제가 발생했습니다.',
          'error'
        );
        return;
      }

      showToast('스터디가 성공적으로 삭제되었습니다.', 'success');

      // 스터디 목록 페이지로 리다이렉트
      setTimeout(() => {
        router.push('/study');
      }, 1000);
    } catch (error) {
      console.error('스터디 삭제 중 오류:', error);
      showToast('스터디 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 수정 성공 시 로컬 상태 업데이트하는 함수
  const handleStudyUpdateSuccess = (updatedData: StudyFormData) => {
    // 기존 스터디 객체가 없으면 종료
    if (!study) return;

    // 날짜 형식 유지를 위한 처리
    const formattedStartDate = updatedData.start_date.includes('T')
      ? updatedData.start_date
      : `${updatedData.start_date}T00:00:00`;

    const formattedEndDate = updatedData.end_date.includes('T')
      ? updatedData.end_date
      : `${updatedData.end_date}T00:00:00`;

    // 스터디 객체 업데이트
    const updatedStudy = {
      ...study,
      title: updatedData.title,
      description: updatedData.description,
      max_participants: updatedData.max_participants,
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      location: updatedData.location,
      is_online: updatedData.is_online,
    };

    // 상태 업데이트
    setStudy(updatedStudy);
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-gold-start"></div>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="mb-4 text-xl font-semibold">
          스터디를 찾을 수 없습니다.
        </h2>
        <Link
          href="/study"
          className="inline-flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          스터디 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/study"
        className="mb-6 inline-flex items-center text-gray-600 hover:text-gold-start"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        스터디 목록으로 돌아가기
      </Link>

      <div className="grid gap-8 md:grid-cols-3">
        {/* 메인 컨텐츠 영역 */}
        <div className="md:col-span-2">
          {/* 상태 배지 및 제목 */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                  study.status === 'recruiting'
                    ? 'bg-green-100 text-green-800'
                    : study.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {study.status === 'recruiting' ? (
                  <>
                    <Clock className="h-4 w-4" /> 모집중
                  </>
                ) : study.status === 'in_progress' ? (
                  <>
                    <Users className="h-4 w-4" /> 진행중
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" /> 완료
                  </>
                )}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                {study.category}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ShareButton
                title={study.title}
                description={`${study.category} 스터디 - ${study.approved_participants}/${study.max_participants}명 확정`}
              />
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="mb-4 flex border-b">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium ${
                activeTab === 'info'
                  ? 'border-gold-start text-gold-start'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <User className="h-4 w-4" />
              스터디 정보
            </button>
            {isParticipant &&
              participants.find((p) => p.user_id === user?.id)?.status ===
                'approved' && (
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium ${
                    activeTab === 'chat'
                      ? 'border-gold-start text-gold-start'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  실시간 토론
                </button>
              )}
          </div>

          {/* 탭 컨텐츠 */}
          <div className="rounded-lg border bg-white shadow-sm">
            {activeTab === 'info' ? (
              // 스터디 정보 탭
              <div className="p-6">
                {isEditMode ? (
                  <StudyEditForm
                    studyId={studyId}
                    initialData={{
                      title: study.title,
                      description: study.description,
                      max_participants: study.max_participants,
                      start_date: study.start_date.split('T')[0],
                      end_date: study.end_date.split('T')[0],
                      location: study.location,
                      is_online: study.is_online,
                    }}
                    onCancel={() => setIsEditMode(false)}
                    onSuccess={handleStudyUpdateSuccess}
                  />
                ) : (
                  <>
                    <div className="mb-4 flex justify-between">
                      <h1 className="text-2xl font-bold">{study.title}</h1>

                      {/* 방장만 볼 수 있는 편집 버튼 */}
                      {user && study.owner_id === user.id && (
                        <button
                          onClick={() => setIsEditMode(true)}
                          className="flex items-center gap-2 rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                        >
                          <Edit2 className="h-4 w-4" />
                          수정
                        </button>
                      )}
                    </div>

                    <div className="mb-6 grid gap-4 rounded-lg bg-gray-50 p-4 text-sm md:grid-cols-2">
                      <div className="flex items-center">
                        <User className="mr-3 h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-gray-500">주최자</p>
                          <div className="flex items-center font-medium">
                            {study.owner_name}
                            <Shield className="ml-1 h-3 w-3 text-amber-500" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-3 h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-gray-500">참여자</p>
                          <p className="font-medium">
                            <span className="text-green-600">
                              {study.approved_participants}
                            </span>
                            /{study.max_participants}명 확정
                            {study.current_participants >
                              study.approved_participants && (
                              <span className="ml-1 text-amber-600">
                                (
                                {study.current_participants -
                                  study.approved_participants}
                                명 대기중)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <CalendarClock className="mr-3 h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-gray-500">스터디 기간</p>
                          <p className="font-medium">
                            {formatDate(study.start_date)} ~{' '}
                            {formatDate(study.end_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {study.is_online ? (
                          <Globe className="mr-3 h-5 w-5 text-gray-500" />
                        ) : (
                          <MapPin className="mr-3 h-5 w-5 text-gray-500" />
                        )}
                        <div>
                          <p className="text-gray-500">장소</p>
                          <p className="font-medium">
                            {study.is_online ? (
                              <span className="flex items-center">
                                온라인{' '}
                                <span className="ml-1 text-blue-500">
                                  (화상미팅)
                                </span>
                              </span>
                            ) : (
                              study.location
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h2 className="mb-3 text-lg font-medium">스터디 설명</h2>
                      <div className="whitespace-pre-wrap rounded-lg border p-4 text-gray-700">
                        {study.description}
                      </div>
                    </div>

                    {/* 연결된 도서 정보 표시 */}
                    {bookInfo && (
                      <div className="mb-6 rounded-lg bg-blue-50 p-4">
                        <h2 className="mb-3 flex items-center text-lg font-medium">
                          <Book className="mr-2 h-5 w-5 text-blue-800" />
                          스터디 도서
                        </h2>
                        <div className="flex items-start">
                          <div className="mr-4 h-24 w-16 overflow-hidden rounded-lg bg-white shadow-sm">
                            {bookInfo.cover_url ? (
                              <Image
                                src={bookInfo.cover_url}
                                alt={bookInfo.title}
                                width={64}
                                height={96}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Book className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{bookInfo.title}</h3>
                            <p className="text-sm text-gray-600">
                              {bookInfo.author}
                            </p>
                            <Link
                              href={`/study/book/${bookInfo.id}`}
                              className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                            >
                              도서 상세정보 보기
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 관리자 전용 버튼 */}
                    {user && study.owner_id === user.id && (
                      <div className="mt-6 flex flex-wrap gap-3 border-t pt-4">
                        {/* 상태 변경 */}
                        <div className="flex items-center rounded-lg border bg-gray-50 p-2">
                          <span className="mr-2 text-sm font-medium">
                            스터디 상태:
                          </span>
                          <select
                            value={study.status}
                            onChange={(e) =>
                              handleChangeStudyStatus(
                                e.target.value as
                                  | 'recruiting'
                                  | 'in_progress'
                                  | 'completed'
                              )
                            }
                            disabled={study.status === 'completed' || isLoading}
                            className="rounded border bg-white p-1 text-sm"
                          >
                            <option value="recruiting">모집중</option>
                            <option value="in_progress">진행중</option>
                            <option value="completed">완료</option>
                          </select>
                        </div>

                        <button
                          onClick={handleDeleteStudy}
                          className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          스터디 삭제
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // 실시간 토론 탭
              <div className="h-[600px]">
                <ChatRoom studyId={studyId} />
              </div>
            )}
          </div>
        </div>

        {/* 사이드바: 참여자 정보 및 참여하기 버튼 */}
        <div>
          <div className="sticky top-4 space-y-6">
            {/* 내 참여 상태 */}
            {isParticipant && (
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h3 className="mb-3 font-medium">내 참여 상태</h3>
                <div className="rounded-lg bg-gray-50 p-3">
                  {(() => {
                    const userStatus = participants.find(
                      (p) => p.user_id === user?.id
                    )?.status;

                    switch (userStatus) {
                      case 'approved':
                        return (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="mr-2 h-5 w-5" />
                            <p>참여가 확정되었습니다</p>
                          </div>
                        );
                      case 'pending':
                        return (
                          <div className="flex items-center text-amber-600">
                            <Clock className="mr-2 h-5 w-5" />
                            <p>승인 대기 중입니다</p>
                          </div>
                        );
                      case 'rejected':
                        return (
                          <div className="flex items-center text-red-600">
                            <XCircle className="mr-2 h-5 w-5" />
                            <p>참여가 거절되었습니다</p>
                          </div>
                        );
                      default:
                        return (
                          <p className="text-gray-600">상태 정보가 없습니다</p>
                        );
                    }
                  })()}
                </div>
              </div>
            )}

            {/* 참여자 정보 카드 */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium">참여자 정보</h2>

              {/* 참여 상태 요약 */}
              <div className="mb-4 flex flex-wrap gap-2">
                <div className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                  확정 인원: {approvedParticipants.length}/
                  {study.max_participants}
                </div>

                {pendingParticipants.length > 0 && (
                  <div className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">
                    대기 중: {pendingParticipants.length}명
                  </div>
                )}
              </div>

              {/* 확정된 참여자 목록 */}
              <div className="mb-6">
                <h3 className="mb-3 flex items-center font-medium text-gray-700">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500"></span>
                  확정된 참여자
                </h3>
                {approvedParticipants.length > 0 ? (
                  <div className="max-h-48 space-y-4 overflow-y-auto pr-2">
                    {approvedParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                            {participant.avatar_url ? (
                              <img
                                src={participant.avatar_url}
                                alt={participant.user_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium">
                                {participant.user_name}
                              </span>
                              {participant.role === 'owner' && (
                                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                  방장
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 방장만 볼 수 있는 강퇴 버튼 */}
                        {user &&
                          study.owner_id === user.id &&
                          participant.user_id !== user.id && (
                            <button
                              onClick={() =>
                                handleKickParticipant(
                                  participant.user_id,
                                  participant.user_name
                                )
                              }
                              className="rounded-lg border border-red-500 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                            >
                              강퇴
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg bg-gray-50 py-4 text-center text-gray-500">
                    확정된 참여자가 없습니다
                  </p>
                )}
              </div>

              {/* 방장만 볼 수 있는 신청자 관리 패널 */}
              {user &&
                study.owner_id === user.id &&
                pendingParticipants.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="mb-3 flex items-center font-medium text-gray-700">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                      승인 대기 중 ({pendingParticipants.length}명)
                    </h3>

                    <div className="max-h-48 space-y-3 overflow-y-auto pr-2">
                      {pendingParticipants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 h-8 w-8 overflow-hidden rounded-full bg-gray-200">
                              {participant.avatar_url ? (
                                <img
                                  src={participant.avatar_url}
                                  alt={participant.user_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <User className="h-4 w-4 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <span className="font-medium">
                              {participant.user_name}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleApproveParticipant(
                                  participant.user_id,
                                  participant.user_name
                                )
                              }
                              className="rounded-md bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
                            >
                              승인
                            </button>
                            <button
                              onClick={() =>
                                handleRejectParticipant(
                                  participant.user_id,
                                  participant.user_name
                                )
                              }
                              className="rounded-md border border-red-500 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                            >
                              거절
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* 참여 신청 버튼 */}
              {!isParticipant &&
                study.status === 'recruiting' &&
                study.current_participants < study.max_participants * 2 && (
                  <button
                    onClick={handleJoinStudy}
                    disabled={isJoining}
                    className="mt-4 w-full rounded-lg bg-gradient-to-r from-gold-start to-gold-end py-2 font-medium text-white transition hover:bg-gradient-to-l disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isJoining ? '신청 중...' : '스터디 참여하기'}
                  </button>
                )}

              {/* 참여 불가 메시지 */}
              {!isParticipant && study.status !== 'recruiting' && (
                <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-gray-600">
                  {study.status === 'in_progress'
                    ? '이미 모집이 마감된 스터디입니다.'
                    : '완료된 스터디입니다.'}
                </div>
              )}

              {!isParticipant &&
                study.status === 'recruiting' &&
                study.current_participants >= study.max_participants * 2 && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-gray-600">
                    신청 가능 인원이 가득 찼습니다.
                  </div>
                )}
            </div>

            {/* 나가기/해체 버튼 - 참여 중인 경우만 표시 */}
            {isParticipant && (
              <div>
                <button
                  onClick={handleLeaveStudy}
                  className="w-full rounded-lg border border-red-500 bg-white py-2 font-medium text-red-500 transition hover:bg-red-50"
                >
                  {study.owner_id === user?.id
                    ? '스터디 해체하기'
                    : '스터디 나가기'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
