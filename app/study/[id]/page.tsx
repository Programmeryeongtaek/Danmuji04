'use client';

import { useToast } from '@/components/common/Toast/Context';
import ShareButton from '@/components/study/ShareButton';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import {
  ArrowLeft,
  CalendarClock,
  Edit,
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
}

interface Participant {
  id: string;
  study_id: string;
  user_id: string;
  user_name: string;
  role: 'owner' | 'participant';
  joined_at: string;
  avatar_url?: string | null;
}

export default function StudyDetailPage() {
  const [study, setStudy] = useState<Study | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      fetchStudyDetails();
    }
  }, [id]); // id를 의존성 배열에 포함

  const fetchStudyDetails = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // 스터디 정보 가져오기
      const { data: studyData, error: studyError } = await supabase
        .from('studies')
        .select('*')
        .eq('id', id)
        .single();

      if (studyError) throw studyError;
      setStudy(studyData);

      // 참여자 정보 가져오기
      const { data: participantData, error: participantError } = await supabase
        .from('study_participants')
        .select('*')
        .eq('study_id', params.id)
        .order('joined_at', { ascending: true });

      if (participantError) throw participantError;

      // 현재 로그인한 사용자가 참여자인지 체크
      if (user) {
        const isParticipating = participantData.some(
          (p) => p.user_id === user.id
        );
        setIsParticipant(isParticipating);

        // 스터디 방장인지 체크
        const isOwn = studyData.owner_id === user.id;
        setIsOwner(isOwn);
      }

      // 참여자 프로필 이미지 가져오기
      const enhancedParticipants = await Promise.all(
        participantData.map(async (participant) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', participant.user_id)
            .single();

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
        })
      );

      setParticipants(enhancedParticipants);
    } catch (error) {
      console.error('Error fetching study details:', error);
      showToast('스터디 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
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

    if (!study) return;

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
      const supabase = createClient();

      // 사용자 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .single();

      const userName =
        profile?.nickname || profile?.name || user.email || '익명';

      // 참여자로 추가
      const { error: participantError } = await supabase
        .from('study_participants')
        .insert({
          study_id: study.id,
          user_id: user.id,
          user_name: userName,
          role: 'participant',
          joined_at: new Date().toISOString(),
        });

      if (participantError) throw participantError;

      // 현재 참여자 수 업데이트
      const { error: updateError } = await supabase
        .from('studies')
        .update({
          current_participants: study.current_participants + 1,
          status:
            study.current_participants + 1 >= study.max_participants
              ? 'in_progress'
              : 'recruiting',
        })
        .eq('id', study.id);

      if (updateError) throw updateError;

      showToast('스터디에 참여했습니다.', 'success');
      fetchStudyDetails(); // 정보 다시 불러오기
    } catch (error) {
      console.error('Error joining study:', error);
      showToast('스터디 참여에 실패했습니다.', 'error');
    } finally {
      setIsJoining(false);
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

              {/* 이 부분에 공유하기 버튼과 관리 버튼을 함께 배치 */}
              <div className="flex items-center gap-2">
                <ShareButton
                  title={`[단무지 스터디] ${study.title}`}
                  description={study.description?.substring(0, 100)}
                  url={
                    typeof window !== 'undefined' ? window.location.href : ''
                  }
                />
                <span>|</span>
                {isOwner && (
                  <Link
                    href={`/study/${study.id}/edit`}
                    className="flex items-center text-lg text-gray-500 hover:text-gold-start"
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    관리
                  </Link>
                )}
              </div>
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
                <MessageCircle className="mr-2 h-4 w-4 text-gray-400" />
                <span>{study.is_online ? '온라인' : study.location}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="mb-2 text-lg font-medium">스터디 설명</h2>
              <div className="whitespace-pre-wrap text-gray-700">
                {study.description}
              </div>
            </div>
          </div>

          {/* 스터디 토론 영역 */}
          <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">스터디 토론</h2>

            {isParticipant ? (
              <div>
                <p className="text-gray-600">
                  참여자들과 소통하고 정보를 공유해보세요.
                </p>
                <Link
                  href={`/study/${study.id}/discussion`}
                  className="mt-4 inline-block rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
                >
                  토론방 입장하기
                </Link>
              </div>
            ) : (
              <div className="text-gray-600">
                스터디에 참여하면 토론에 참여할 수 있습니다.
              </div>
            )}
          </div>
        </div>

        {/* 참여자 정보 및 참여하기 버튼 */}
        <div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">참여자 정보</h2>

            <div className="space-y-4">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center">
                  <div className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                    {participant.avatar_url ? (
                      <Image
                        src={participant.avatar_url}
                        alt={participant.user_name}
                        width={40}
                        height={40}
                        objectFit="cover"
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
        </div>
      </div>
    </div>
  );
}
