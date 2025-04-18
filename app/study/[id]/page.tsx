'use client';

import { useToast } from '@/components/common/Toast/Context';
import ChatRoom from '@/components/study/ChatRoom';
import ShareButton from '@/components/study/ShareButton';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { useAtomValue } from 'jotai';
import {
  ArrowLeft,
  Book,
  CalendarClock,
  MapPin,
  MessageCircle,
  User,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Study {
  id: string;
  title: string;
  description: string;
  category: string;
  owner_id: string;
  owner_name: string;
  max_participants: number;
  current_participants: number;
  start_date: string;
  end_date: string;
  location: string;
  is_online: boolean;
  status: 'recruiting' | 'in_progress' | 'completed';
  created_at: string;
  book_id?: string | null;
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
  joined_at: string;
  avatar_url?: string | null;
  last_active_at?: string | null;
}

export default function StudyDetailPage() {
  const [study, setStudy] = useState<Study | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();
  const user = useAtomValue(userAtom);
  const params = useParams();
  const studyId = params.id as string;

  useEffect(() => {
    if (studyId) {
      fetchStudyDetails();
    }
  }, [studyId]);

  // 스터디 정보 및 참여자 정보 가져오기 - 여러 함수로 분리
  const fetchStudyDetails = async () => {
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
  };

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

    // 참여자 수 동기화를 위한 참여자 정보 조회
    const { data: participantCount, error: participantCountError } =
      await supabase
        .from('study_participants')
        .select('id', { count: 'exact' })
        .eq('study_id', studyId);

    const actualParticipantCount = participantCount?.length || 0;

    if (!participantCountError) {
      // 실제 참여자 수와 DB의 값이 다른 경우 업데이트
      if (actualParticipantCount !== studyData.current_participants) {
        const updatedStudyData = {
          ...studyData,
          current_participants: actualParticipantCount,
        };

        // DB 업데이트
        await supabase
          .from('studies')
          .update({ current_participants: actualParticipantCount })
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
      console.log('사용자 참여 상태:', isUserParticipating);
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

    if (isParticipant) {
      showToast('이미 참여 중인 스터디입니다.', 'error');
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

    if (study.current_participants >= study.max_participants) {
      showToast('참여 인원이 가득 찼습니다.', 'error');
      return;
    }

    setIsJoining(true);

    try {
      console.log('스터디 참여 시도:', { studyId, userId: user.id });
      const supabase = createClient();

      // 1. 중복 참여 검사
      const { data: existingParticipant, error: checkError } = await supabase
        .from('study_participants')
        .select('id')
        .eq('study_id', studyId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('참여자 확인 중 오류:', checkError);
      }

      if (existingParticipant) {
        console.log('이미 참여 중인 스터디입니다:', existingParticipant);
        setIsParticipant(true);
        showToast('이미 참여 중인 스터디입니다.', 'info');
        setIsJoining(false);
        return;
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

      // 3. 참여자로 추가
      const { error: participantError } = await supabase
        .from('study_participants')
        .insert({
          study_id: studyId,
          user_id: user.id,
          user_name: userName,
          role: 'participant',
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        });

      if (participantError) {
        console.error('참여자 등록 중 오류:', participantError);
        throw participantError;
      }

      // 4. 현재 스터디 정보 가져오기
      const { data: studyData, error: fetchError } = await supabase
        .from('studies')
        .select('current_participants')
        .eq('id', studyId)
        .single();

      if (fetchError) {
        console.error('스터디 정보 조회 오루:', fetchError);
        throw fetchError;
      }

      // 5. 현재 참여자 수 업데이트
      const newParticipantCount = (studyData?.current_participants || 0) + 1;
      const newStatus =
        newParticipantCount >= study.max_participants
          ? 'in_progress'
          : 'recruiting';

      const { error: updateError } = await supabase
        .from('studies')
        .update({
          current_participants: newParticipantCount,
          status: newStatus,
        })
        .eq('id', studyId);

      if (updateError) {
        console.error('스터디 정보 업데이트 중 오류:', updateError);
        throw updateError;
      }

      console.log('스터디 참여 성공');
      showToast('스터디에 참여했습니다.', 'success');
      setIsParticipant(true);

      // study 상태 즉시 업데이트
      setStudy({
        ...study,
        current_participants: newParticipantCount,
        status: newStatus,
      });

      // 페이지 새로고침하여 최신 데이터 가져오기
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
          // 1. 먼저 hard delete 시도
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

          // 2. 참여자 수 업데이트
          const { data: currentStudy } = await supabase
            .from('studies')
            .select('current_participants')
            .eq('id', studyId)
            .single();

          if (currentStudy) {
            const newCount = Math.max(0, currentStudy.current_participants - 1);
            await supabase
              .from('studies')
              .update({ current_participants: newCount })
              .eq('id', studyId);
          }

          // 3. UI 상태 업데이트 (DB 작업 결과와 무관하게)
          setParticipants((prev) => prev.filter((p) => p.user_id !== user.id));
          setIsParticipant(false);
          setStudy((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              current_participants: Math.max(0, prev.current_participants - 1),
            };
          });

          showToast('스터디에서 나갔습니다.', 'success');

          // 4. 페이지 강제 새로고침 또는 리다이렉트
          setTimeout(() => {
            // 새로고침 대신 목록 페이지로 리다이렉트
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
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="mb-4 text-xl">스터디를 찾을 수 없습니다.</h2>
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
        {/* 스터디 정보 */}
        <div className="md:col-span-2">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    study.status === 'recruiting'
                      ? 'bg-green-100 text-green-800'
                      : study.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {study.status === 'recruiting'
                    ? '모집중'
                    : study.status === 'in_progress'
                      ? '진행중'
                      : '완료'}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  {study.category}
                </span>
              </div>

              {/* 공유 버튼 */}
              <ShareButton
                title={study.title}
                description={`${study.category} 스터디 - ${study.current_participants}/${study.max_participants}명 참여 중`}
              />
            </div>

            <h1 className="mb-4 text-2xl font-bold">{study.title}</h1>

            <div className="mb-6 grid gap-2 text-sm md:grid-cols-2">
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4 text-gray-400" />
                <span>주최자: {study.owner_name}</span>
              </div>
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-gray-400" />
                <span>
                  {study.current_participants}/{study.max_participants}명 참여
                  중
                </span>
              </div>
              <div className="flex items-center">
                <CalendarClock className="mr-2 h-4 w-4 text-gray-400" />
                <span>
                  {formatDate(study.start_date)} ~ {formatDate(study.end_date)}
                </span>
              </div>
              <div className="flex items-center">
                <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                <span>{study.is_online ? '온라인' : study.location}</span>
              </div>
            </div>

            {/* 연결된 도서 정보 표시 */}
            {bookInfo && (
              <div className="mb-6 flex rounded-lg bg-blue-50 p-4">
                <div className="mr-4 h-20 w-14 overflow-hidden rounded bg-white shadow">
                  {bookInfo.cover_url ? (
                    <Image
                      src={bookInfo.cover_url}
                      alt={bookInfo.title}
                      width={56}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Book className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-800">
                    스터디 도서
                  </div>
                  <div className="font-medium">{bookInfo.title}</div>
                  <div className="text-sm text-gray-600">{bookInfo.author}</div>
                  <Link
                    href={`/study/book/${bookInfo.id}`}
                    className="mt-2 inline-block text-xs text-blue-500 hover:underline"
                  >
                    도서 상세정보 보기
                  </Link>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h2 className="mb-2 text-lg font-medium">스터디 설명</h2>
              <div className="whitespace-pre-wrap text-gray-700">
                {study.description}
              </div>
            </div>
          </div>

          {/* 참여자만 볼 수 있는 스터디 콘텐츠 영역 */}
          {isParticipant ? (
            <div className="mt-8">
              {/* 토론 채팅 헤더 - 탭 네비게이션 대신 일반 헤더로 변경 */}
              <div className="mb-4 flex items-center border-b pb-2">
                <MessageCircle className="mr-2 h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-medium">실시간 토론</h2>
              </div>

              {/* 채팅 영역 */}
              <div className="h-[500px]">
                <ChatRoom studyId={studyId} />
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium">스터디 토론</h2>

              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle className="mb-3 h-10 w-10 text-gray-300" />
                <p className="mb-4 text-gray-600">
                  스터디에 참여하면 실시간 토론방에 참여할 수 있습니다.
                </p>
                {study.status === 'recruiting' &&
                  study.current_participants < study.max_participants && (
                    <button
                      onClick={handleJoinStudy}
                      disabled={isJoining}
                      className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isJoining ? '참여 신청 중...' : '스터디 참여하기'}
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* 참여자 정보 및 참여하기 버튼 */}
        <div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">참여자 정보</h2>

            <div className="space-y-4">
              {participants.map((participant) => (
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
                      <div className="text-sm text-gray-500">
                        {new Date(participant.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* 방장이고, 방장이 아닌 참여자에게만 강퇴 버튼 표시 */}
                  {study?.owner_id === user?.id &&
                    participant.user_id !== user?.id && (
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

            {!isParticipant &&
              study.status === 'recruiting' &&
              study.current_participants < study.max_participants && (
                <button
                  onClick={handleJoinStudy}
                  disabled={isJoining}
                  className="mt-6 w-full rounded-lg bg-gradient-to-r from-gold-start to-gold-end py-2 font-medium text-white transition hover:bg-gradient-to-l disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isJoining ? '참여 신청 중...' : '스터디 참여하기'}
                </button>
              )}

            {isParticipant && (
              <div className="mt-6 text-center text-green-600">
                이 스터디에 참여 중입니다
              </div>
            )}

            {study.status !== 'recruiting' && (
              <div className="mt-6 text-center text-gray-600">
                {study.status === 'in_progress'
                  ? '이미 모집이 마감된 스터디입니다.'
                  : '완료된 스터디입니다.'}
              </div>
            )}

            {study.status === 'recruiting' &&
              study.current_participants >= study.max_participants && (
                <div className="mt-6 text-center text-gray-600">
                  참여 인원이 가득 찼습니다.
                </div>
              )}
          </div>

          {isParticipant && (
            <div className="mt-6">
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
  );
}
