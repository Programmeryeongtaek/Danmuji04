import { useEffect, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { Camera, LinkIcon, Video, X } from 'lucide-react';

interface VideoMeetingProps {
  studyId: string;
  isOwner?: boolean;
}

interface MeetingInfo {
  id: string;
  provider: 'zoom' | 'google';
  join_url: string;
  start_url?: string; // 방장만 사용
  password?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function VideoMeeting({
  studyId,
  isOwner = false,
}: VideoMeetingProps) {
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<'zoom' | 'google'>(
    'zoom'
  );
  const [showForm, setShowForm] = useState(false);
  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  // 기존 회의 정보 가져오기
  useEffect(() => {
    const fetchMeetingInfo = async () => {
      if (!studyId) return;

      try {
        setIsLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('study_meeting')
          .select('*')
          .eq('study_id', studyId)
          .maybeSingle();

        if (error) throw error;
        setMeeting(data);
      } catch (error) {
        console.error('회의 정보 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetingInfo();
  }, [studyId]);

  // 회의 생성 함수
  const createMeeting = async () => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    if (!isOwner) {
      showToast('스터디 방장만 회의를 생성할 수 있습니다.', 'error');
      return;
    }

    setIsCreating(true);

    try {
      const supabase = createClient();
      let meetingData: Partial<MeetingInfo> = {
        provider: selectedProvider,
        created_by: user.id,
      };

      // 선택한 제공업체에 따라 회의 생성
      // API를 통해 Zoom/Google Meet 회의 생성 요청
      const response = await fetch(`/api/meetings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          studyId,
          topic: `스터디 모임 (ID: ${studyId})`,
        }),
      });

      if (!response.ok) {
        throw new Error('회의 생성에 실패했습니다.');
      }

      const data = await response.json();
      meetingData = {
        ...meetingData,
        join_url: data.join_url,
        start_url: data.start_url,
        password: data.password,
      };

      // 데이터베이스에 회의 정보 저장
      const { data: newMeeting, error } = await supabase
        .from('study_meeting')
        .upsert({
          study_id: studyId,
          provider: meetingData.provider,
          join_url: meetingData.join_url,
          start_url: meetingData.start_url,
          password: meetingData.password,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setMeeting(newMeeting);
      setShowForm(false);
      showToast('회의가 생성되었습니다.', 'success');

      // 스터디 참여자들에게 알림 전송
      await supabase.rpc('notify_study_participants', {
        p_study_id: studyId,
        p_message: '새로운 화상 회의가 생성되었습니다.',
        p_type: 'meeting_created',
      });
    } catch (error) {
      console.error('회의 생성 실패:', error);
      showToast('회의 생성에 실패했습니다.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // 회의 복사 함수
  const copyMeetingLink = async () => {
    if (!meeting?.join_url) return;

    navigator.clipboard.writeText(meeting.join_url).then(
      () => {
        showToast('회의 링크가 복사되었습니다.', 'success');
      },
      () => {
        showToast('링크 복사에 실패했습니다.', 'error');
      }
    );
  };

  // 회의 종료 함수
  const endMeeting = async () => {
    if (!meeting || !isOwner) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('study_meeting')
        .delete()
        .eq('id', meeting.id);

      if (error) throw error;

      setMeeting(null);
      showToast('회의가 종료되었습니다.', 'success');
    } catch (error) {
      console.error('회의 종료 실패:', error);
      showToast('회의 종료에 실패했습니다.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">화상 회의</h3>

      {meeting ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
            <Video className="h-5 w-5 text-blue-500" />
            <div className="flex-1">
              <div className="font-medium">화상 회의가 준비되었습니다</div>
              <div className="text-sm text-gray-500">
                {new Date(meeting.updated_at).toLocaleString()} 생성됨
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={meeting.join_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              <Camera className="h-5 w-5" />
              <span>회의 참여하기</span>
            </a>

            <button
              onClick={copyMeetingLink}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50"
            >
              <LinkIcon className="h-5 w-5" />
              <span>링크 복사</span>
            </button>

            {isOwner && (
              <button
                onClick={endMeeting}
                className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-red-500 hover:bg-red-50"
              >
                <X className="h-5 w-5" />
                <span>회의 종료</span>
              </button>
            )}
          </div>

          {meeting.password && (
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-sm font-medium">회의 비밀번호</div>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                  {meeting.password}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(meeting.password || '');
                    showToast('비밀번호가 복사되었습니다.', 'success');
                  }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  복사
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isOwner ? (
        <div>
          {showForm ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProvider('zoom')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 ${
                    selectedProvider === 'zoom'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="h-6 w-6 flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none">
                      <rect width="24" height="24" rx="2" fill="#1B75CF" />
                      <path
                        d="M12 6.5C9 6.5 6.5 9 6.5 12C6.5 15 9 17.5 12 17.5C15 17.5 17.5 15 17.5 12C17.5 9 15 6.5 12 6.5ZM12 15.5C10.1 15.5 8.5 13.9 8.5 12C8.5 10.1 10.1 8.5 12 8.5C13.9 8.5 15.5 10.1 15.5 12C15.5 13.9 13.9 15.5 12 15.5Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Zoom Meet</div>
                    <div className="text-xs text-gray-500">무료 화상 회의</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('zoom')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 ${
                    selectedProvider === 'zoom'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="h-6 w-6 flex-shrink-0">
                    <LinkIcon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">커스텀 URL</div>
                    <div className="text-xs text-gray-500">직접 URL 입력</div>
                  </div>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={createMeeting}
                  disabled={isCreating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {isCreating ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Video className="h-5 w-5" />
                  )}
                  <span>회의 생성</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-6">
              <Video className="h-10 w-10 text-gray-400" />
              <div className="text-center">
                <p className="font-medium">아직 회의가 없습니다</p>
                <p className="text-sm text-gray-500">
                  화상 회의를 생성하고 팀원들과 소통하세요
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                <Video className="h-5 w-5" />
                <span>회의 생성하기</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <Video className="h-10 w-10 text-gray-400" />
          <div className="text-center">
            <p className="font-medium">아직 회의가 없습니다</p>
            <p className="text-sm text-gray-500">
              스터디 방장이 회의를 생성하면 여기에 표시됩니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
