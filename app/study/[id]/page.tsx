'use client';

import { useToast } from '@/components/common/Toast/Context';
import BookmarkButton from '@/components/study/BookmarkButton';
import ChatRoom from '@/components/study/ChatRoom';
import ShareButton from '@/components/study/ShareButton';
import StudyEditForm from '@/components/study/StudyEditForm';
import {
  useDeleteStudy,
  useJoinStudy,
  useKickParticipant,
  useLeaveStudy,
  useStudyDetails,
  useUpdateParticipantStatus,
  useUpdateStudyStatus,
} from '@/hooks/api/useStudyManagement';
import { userAtom } from '@/store/auth';
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
import { useState } from 'react';

export default function StudyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studyId = params.id as string;
  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('info');
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: studyDetails, isLoading, error } = useStudyDetails(studyId);
  const { mutate: joinStudy, isPending: isJoining } = useJoinStudy();
  const { mutate: updateParticipantStatus } = useUpdateParticipantStatus();
  const { mutate: updateStudyStatus } = useUpdateStudyStatus();
  const { mutate: leaveStudy, isPending: isLeaving } = useLeaveStudy();
  const { mutate: kickParticipant } = useKickParticipant();
  const { mutate: deleteStudy } = useDeleteStudy();

  // studyDetails에서 모든 정보 추출 (안전한 접근)
  const study = studyDetails?.study;
  const book = studyDetails?.book;
  const pendingParticipants = studyDetails?.pendingParticipants || [];
  const approvedParticipants = studyDetails?.approvedParticipants || [];
  const userParticipationStatus =
    studyDetails?.userParticipationStatus || 'not_joined';
  const isOwner = studyDetails?.isOwner || false;

  // 참여 신청 관리
  const handleJoinStudy = () => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
      return;
    }

    if (!study || study.status !== 'recruiting') {
      showToast('모집이 마감된 스터디입니다.', 'error');
      return;
    }

    if (study.current_participants >= study.max_participants * 2) {
      showToast('신청 가능 인원이 가득 찼습니다.', 'error');
      return;
    }

    const userName = user.user_metadata?.full_name || user.email || '사용자';
    joinStudy({ studyId, userName });
  };

  // 참여자 승인 / 거부 (개설자)
  const handleParticipantAction = (
    participantId: string,
    status: 'approved' | 'rejected'
  ) => {
    updateParticipantStatus({ studyId, participantId, status });
  };

  // 스터디 상태 변경 (개설자)
  const handleStatusChange = (
    newStatus: 'recruiting' | 'in_progress' | 'completed'
  ) => {
    if (!isOwner) {
      showToast('스터디 방장만 상태를 변경할 수 있습니다.', 'error');
      return;
    }

    if (
      newStatus === 'completed' &&
      !confirm(
        '완료 상태를 선택하면, 스터디 상태를 변경할 수 없습니다. 계속하시겠습니까?'
      )
    ) {
      return;
    }

    updateStudyStatus({ studyId, status: newStatus });
  };

  // 나가기/해체
  const handleLeaveStudy = () => {
    if (!study) return;

    const isOwnerUser = study.owner_id === user?.id;
    const actionText = isOwnerUser ? '해체' : '나가기';

    if (isOwnerUser && study.status !== 'recruiting') {
      showToast('진행 중이거나 완료된 스터디는 해체할 수 없습니다.', 'error');
      return;
    }

    if (!confirm(`정말로 스터디를 ${actionText}하시겠습니까?`)) return;

    leaveStudy(
      { studyId, isOwner: isOwnerUser },
      {
        onSuccess: () => {
          router.push('/study');
        },
      }
    );
  };

  // 강퇴
  const handleKickParticipant = (
    participantId: string,
    participantName: string
  ) => {
    if (!confirm(`정말로 ${participantName}님을 강퇴하시겠습니까?`)) return;

    kickParticipant({ studyId, participantId });
  };

  // 삭제
  const handleDeleteStudy = () => {
    if (!study || study.owner_id !== user?.id) {
      showToast('스터디 방장만 삭제할 수 있습니다.', 'error');
      return;
    }

    if (
      !confirm(
        '정말로 스터디를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return;
    }

    deleteStudy(
      { studyId },
      {
        onSuccess: () => {
          router.push('/study');
        },
      }
    );
  };

  // 수정 성공 핸들러
  const handleStudyUpdateSuccess = () => {
    setIsEditMode(false);
    showToast('스터디가 성공적으로 수정되었습니다.', 'success');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!study) {
    return (
      <div className="py-12 text-center">
        <h1 className="mb-4 text-2xl font-bold">스터디를 찾을 수 없습니다</h1>
        <button
          onClick={() => router.push('/study')}
          className="text-gold-start hover:underline"
        >
          스터디 목록으로 돌아가기
        </button>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
      </div>
    );
  }

  // 에러 상태
  if (error || !studyDetails) {
    return (
      <div className="py-12 text-center">
        <h1 className="mb-4 text-2xl font-bold">스터디를 찾을 수 없습니다</h1>
        <button
          onClick={() => router.push('/study')}
          className="text-gold-start hover:underline"
        >
          스터디 목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto py-12 mobile:px-4 tablet:px-6">
      <Link
        href="/study"
        className="inline-flex items-center text-gray-600 hover:text-gold-start mobile:mb-2 tablet:mb-4 laptop:mb-4"
      >
        <ArrowLeft className="mobile:h-4 mobile:w-4 tablet:h-6 tablet:w-6" />
      </Link>

      <div className="grid tablet:grid-cols-3 tablet:gap-4 laptop:gap-8">
        {/* 메인 컨텐츠 영역 */}
        <div className="tablet:col-span-2">
          {/* 상태 배지 및 제목 */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                {study.category}
              </span>
            </div>

            <div className="flex gap-2">
              <ShareButton
                title={study.title}
                description={`${study.category} 스터디 - ${study.approved_participants}/${study.max_participants}명 확정`}
              />
              <BookmarkButton studyId={studyId} />
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="mb-4 flex justify-between">
            <div className="flex border-b">
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
              {userParticipationStatus === 'approved' && (
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

            {/* 방장만 볼 수 있는 편집 버튼 */}
            {isOwner && (
              <div className="flex justify-end gap-2">
                {/* 상태 변경 */}
                <select
                  value={study.status}
                  onChange={(e) =>
                    handleStatusChange(
                      e.target.value as
                        | 'recruiting'
                        | 'in_progress'
                        | 'completed'
                    )
                  }
                  disabled={study.status === 'completed' || isLoading}
                  className="cursor-pointer rounded border bg-white p-1 text-sm hover:border-gold-start hover:bg-gold-start"
                >
                  <option value="recruiting">모집중</option>
                  <option value="in_progress">진행중</option>
                  <option value="completed">완료</option>
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1 text-sm hover:border-gold-start hover:bg-gold-start hover:text-black"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleDeleteStudy}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1 text-sm hover:border-gold-start hover:bg-gold-start hover:text-black"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
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
                    <div className="mb-4 flex flex-col">
                      <h1 className="text-2xl font-bold">{study.title}</h1>
                    </div>

                    <div className="mb-6 grid gap-4 rounded-lg bg-light p-4 text-sm md:grid-cols-2">
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
                          <p className="text-gray-500">기간</p>
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
                              <span>온라인</span>
                            ) : (
                              study.location
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h2 className="mb-3 text-lg font-medium">소개</h2>
                      <div className="whitespace-pre-wrap rounded-lg border bg-light p-4 text-gray-700">
                        {study.description}
                      </div>
                    </div>

                    {/* 연결된 도서 정보 표시 */}
                    {book && (
                      <div className="mb-6 rounded-lg bg-light p-4">
                        <div className="flex justify-between">
                          <h2 className="mb-3 flex items-center text-lg font-medium">
                            <Book className="mr-2 h-5 w-5 text-black" />
                            스터디 도서
                          </h2>
                          <Link
                            href={`/study/book/${book.id}`}
                            className="flex items-center rounded-xl bg-gold-start px-2 text-sm text-black"
                          >
                            <span>도서정보</span>
                          </Link>
                        </div>
                        <div className="flex items-start">
                          <div className="mr-4 h-24 w-16 overflow-hidden rounded-lg bg-white shadow-sm">
                            {book.cover_url ? (
                              <Image
                                src={book.cover_url}
                                alt={book.title}
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
                            <h3 className="font-medium">{book.title}</h3>
                            <p className="text-sm text-gray-600">
                              {book.author}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // 실시간 토론 탭
              <div className="mobile:h-[400px] tablet:h-[600px]">
                <ChatRoom studyId={studyId} />
              </div>
            )}
          </div>
        </div>

        {/* 사이드바: 참여자 정보 및 참여하기 버튼 */}
        <div>
          <div className="sticky top-4 space-y-6">
            {/* 내 참여 상태 */}
            {userParticipationStatus !== 'not_joined' && (
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h3 className="mb-3 font-medium">참여 상태</h3>
                <div className="rounded-lg bg-light p-3">
                  {(() => {
                    switch (userParticipationStatus) {
                      case 'approved':
                        return (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="mr-2 h-5 w-5" />
                            <p>참여가 확정되었습니다.</p>
                          </div>
                        );
                      case 'pending':
                        return (
                          <div className="flex items-center text-amber-600">
                            <Clock className="mr-2 h-5 w-5" />
                            <p>승인 대기 중입니다.</p>
                          </div>
                        );
                      case 'rejected':
                        return (
                          <div className="flex items-center text-red-600">
                            <XCircle className="mr-2 h-5 w-5" />
                            <p>참여가 거절되었습니다.</p>
                          </div>
                        );
                      default:
                        return (
                          <p className="text-gray-600">상태 정보가 없습니다.</p>
                        );
                    }
                  })()}
                </div>
              </div>
            )}

            {/* 참여자 정보 카드 */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex justify-between">
                <h2 className="mb-4 text-lg font-medium">참여자 정보</h2>
                <div className="flex items-center justify-center rounded-full bg-gold-start px-3 text-sm text-black">
                  확정 인원: {approvedParticipants.length}/
                  {study.max_participants}
                </div>
              </div>

              {/* 참여 상태 요약 */}
              <div className="mb-4 flex flex-wrap gap-2">
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
                        {isOwner && participant.user_id !== user?.id && (
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
              {isOwner && pendingParticipants.length > 0 && (
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
                              handleParticipantAction(
                                participant.id,
                                'approved'
                              )
                            }
                            className="rounded-md bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
                          >
                            승인
                          </button>
                          <button
                            onClick={() =>
                              handleParticipantAction(
                                participant.id,
                                'rejected'
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
              {userParticipationStatus === 'not_joined' &&
                study.status === 'recruiting' &&
                study.current_participants < study.max_participants * 2 && (
                  <button
                    onClick={handleJoinStudy}
                    disabled={isJoining}
                    className="mt-4 w-full rounded-lg bg-gradient-to-r from-gold-start to-gold-end py-2 font-medium text-white transition hover:bg-gradient-to-l disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isJoining ? '신청 중...' : '스터디 참여'}
                  </button>
                )}

              {/* 참여 불가 메시지 */}
              {userParticipationStatus === 'not_joined' &&
                study.status !== 'recruiting' && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-gray-600">
                    {study.status === 'in_progress'
                      ? '이미 모집이 마감된 스터디입니다.'
                      : '완료된 스터디입니다.'}
                  </div>
                )}

              {userParticipationStatus === 'not_joined' &&
                study.status === 'recruiting' &&
                study.current_participants >= study.max_participants * 2 && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-gray-600">
                    신청 가능 인원이 가득 찼습니다.
                  </div>
                )}
            </div>

            {/* 나가기/해체 버튼 - 참여 중인 경우만 표시 */}
            {userParticipationStatus !== 'not_joined' && (
              <div>
                <button
                  onClick={handleLeaveStudy}
                  disabled={isLeaving}
                  className="w-full rounded-lg border border-red-500 bg-white py-2 font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLeaving
                    ? '처리 중...'
                    : study.owner_id === user?.id
                      ? '스터디 해체'
                      : '나가기'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
