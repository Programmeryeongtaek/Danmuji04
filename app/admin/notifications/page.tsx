'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import {
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Send,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';

interface NotificationTemplate {
  id: number;
  title: string;
  message: string;
  type: string;
}

export default function NotificationsManagePage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<
    'all' | 'instructors' | 'students' | 'custom'
  >('all');
  const [customRoles, setCustomRoles] = useState<string[]>(['normal']);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customRolesOpen, setCustomRolesOpen] = useState(false);
  const [targetUserCount, setTargetUserCount] = useState(0);

  const customRolesRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdminStatus = async () => {
      const supabase = createClient();

      // 사용자 세션 확인
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // 관리자 권한 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        router.push('/');
        showToast('관리자 권한이 필요합니다.', 'error');
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);

      // 템플릿 로드
      loadTemplates();
    };

    checkAdminStatus();
  }, [router, showToast]);

  // 템플릿 로드 함수
  const loadTemplates = async () => {
    try {
      console.log('템플릿 로드 시작');
      const supabase = createClient();

      // 먼저 테이블 존재 여부 확인
      const { data: tableInfo, error: tableError } = await supabase
        .from('notification_templates')
        .select('id')
        .limit(1);

      console.log('테이블 존재 확인:', tableInfo, tableError);

      if (tableError) {
        console.error('테이블 확인 오류:', tableError);
        // 테이블이 없다면 기본 템플릿 데이터로 대체
        setTemplates([
          {
            id: 1,
            title: '새로운 강의 추가',
            message: '새로운 강의가 등록되었습니다. 지금 확인해보세요!',
            type: 'system',
          },
          {
            id: 2,
            title: '시스템 점검 안내',
            message:
              '서비스 개선을 위한 점검이 예정되어 있습니다. 자세한 내용은 공지사항을 참고해주세요.',
            type: 'system',
          },
          {
            id: 3,
            title: '이벤트 안내',
            message:
              '새로운 이벤트가 시작되었습니다. 지금 참여하고 혜택을 받아보세요!',
            type: 'event',
          },
        ]);
        return;
      }

      // 템플릿 정보 가져오기
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('템플릿 로드 오류:', error);
        throw error;
      }

      console.log('로드된 템플릿:', data);
      setTemplates(data || []);
    } catch (error) {
      console.error('템플릿 로드 실패:', error);
      // 오류 발생 시 기본 데이터로 대체
      setTemplates([
        {
          id: 1,
          title: '새로운 강의 추가',
          message: '새로운 강의가 등록되었습니다. 지금 확인해보세요!',
          type: 'system',
        },
        {
          id: 2,
          title: '시스템 점검 안내',
          message:
            '서비스 개선을 위한 점검이 예정되어 있습니다. 자세한 내용은 공지사항을 참고해주세요.',
          type: 'system',
        },
        {
          id: 3,
          title: '이벤트 안내',
          message:
            '새로운 이벤트가 시작되었습니다. 지금 참여하고 혜택을 받아보세요!',
          type: 'event',
        },
      ]);
    }
  };

  // 커스텀 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customRolesRef.current &&
        !customRolesRef.current.contains(event.target as Node)
      ) {
        setCustomRolesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 대상 사용자 수 계산
  useEffect(() => {
    const calculateTargetUsers = async () => {
      try {
        const supabase = createClient();
        let query = supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });

        if (targetAudience === 'instructors') {
          query = query.eq('role', 'instructor');
        } else if (targetAudience === 'students') {
          query = query.eq('role', 'normal');
        } else if (targetAudience === 'custom' && customRoles.length > 0) {
          query = query.in('role', customRoles);
        }

        const { count, error } = await query;

        if (error) throw error;
        setTargetUserCount(count || 0);
      } catch (error) {
        console.error('대상 사용자 수 계산 중 오류:', error);
      }
    };

    calculateTargetUsers();
  }, [targetAudience, customRoles]);

  // 템플릿 선택 시 필드 업데이트
  const handleTemplateSelect = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setTitle(template.title);
    setMessage(template.message);
  };

  // 역할 토글 함수
  const toggleRole = (role: string) => {
    setCustomRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  // 알림 전송 함수
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title || !message) {
      showToast('제목과 내용을 입력해주세요.', 'error');
      return;
    }

    if (isScheduled && (!scheduleDate || !scheduleTime)) {
      showToast('예약 발송 시간을 설정해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 대상 사용자 조회
      let userQuery = supabase.from('profiles').select('id');

      if (targetAudience === 'instructors') {
        userQuery = userQuery.eq('role', 'instructor');
      } else if (targetAudience === 'students') {
        userQuery = userQuery.eq('role', 'normal');
      } else if (targetAudience === 'custom' && customRoles.length > 0) {
        userQuery = userQuery.in('role', customRoles);
      }

      const { data: targetUsers, error: usersError } = await userQuery;

      if (usersError) throw usersError;

      if (!targetUsers || targetUsers.length === 0) {
        showToast('대상 사용자가 없습니다.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 알림 데이터 생성
      const scheduledTime = isScheduled
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : null;

      const notifications = targetUsers.map((targetUser) => ({
        user_id: targetUser.id,
        title,
        message,
        type: 'admin_broadcast',
        related_data: {
          sender_id: user?.id,
          scheduled: isScheduled,
          audience: targetAudience,
        },
        read: false,
        scheduled_at: scheduledTime,
        created_at: new Date().toISOString(),
      }));

      // 알림 전송 (또는 예약)
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      // 현재 시간에 바로 발송하는 경우 Realtime을 통해 알림
      // 예약된 알림은 서버 측 cron job이나 Edge Function으로 처리 필요

      showToast(
        isScheduled
          ? `${new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}에 알림이 예약되었습니다.`
          : `${targetUsers.length}명에게 알림이 전송되었습니다.`,
        'success'
      );

      // 입력 필드 초기화
      setTitle('');
      setMessage('');
      setSelectedTemplate(null);
      setIsScheduled(false);
      setScheduleDate('');
      setScheduleTime('');
    } catch (error) {
      console.error('알림 전송 중 오류:', error);
      showToast('알림 전송에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">알림 관리</h1>
          <p className="text-gray-600">사용자에게 일괄 알림을 발송합니다</p>
        </div>

        <Link
          href="/admin"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:border-gold-start hover:bg-gold-start hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 알림 작성 폼 */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border bg-white p-6 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold">새 알림 작성</h2>

            {/* 템플릿 선택 */}
            {templates.length > 0 && (
              <div className="mb-4">
                <label className="mb-1 block font-medium">
                  템플릿 선택 (선택사항)
                </label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className={`rounded-lg border px-3 py-1 text-sm transition ${
                        selectedTemplate?.id === template.id
                          ? 'border-gold-start bg-light'
                          : 'hover:border-gold-start hover:bg-light'
                      }`}
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="title" className="mb-1 block font-medium">
                알림 제목
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="message" className="mb-1 block font-medium">
                알림 내용
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                required
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="mb-1 block font-medium">대상 사용자</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTargetAudience('all')}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1 text-sm transition ${
                    targetAudience === 'all'
                      ? 'border-gold-start bg-light'
                      : 'hover:border-gold-start hover:bg-light'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>전체</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('instructors')}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm transition ${
                    targetAudience === 'instructors'
                      ? 'border-gold-start bg-light'
                      : 'hover:border-gold-start hover:bg-light'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>강사</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('students')}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm transition ${
                    targetAudience === 'students'
                      ? 'border-gold-start bg-light'
                      : 'hover:border-gold-start hover:bg-light'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>일반</span>
                </button>

                <div className="relative" ref={customRolesRef}>
                  <button
                    type="button"
                    onClick={() => setCustomRolesOpen(!customRolesOpen)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm transition ${
                      targetAudience === 'custom'
                        ? 'border-gold-start bg-light'
                        : 'hover:border-gold-start hover:bg-light'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>대상</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {customRolesOpen && (
                    <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border bg-white shadow-lg">
                      <div className="p-2">
                        <div className="mb-2 px-3 py-1 text-xs font-medium text-gray-500">
                          선택 (다중 선택 가능)
                        </div>
                        <div className="space-y-1">
                          <label className="flex cursor-pointer items-center gap-2 rounded px-3 py-1 hover:bg-gray-100">
                            <input
                              type="checkbox"
                              checked={customRoles.includes('normal')}
                              onChange={() => toggleRole('normal')}
                              className="rounded"
                            />
                            <span>일반 사용자</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 rounded px-3 py-1 hover:bg-gray-100">
                            <input
                              type="checkbox"
                              checked={customRoles.includes('instructor')}
                              onChange={() => toggleRole('instructor')}
                              className="rounded"
                            />
                            <span>강사</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 rounded px-3 py-1 hover:bg-gray-100">
                            <input
                              type="checkbox"
                              checked={customRoles.includes('manager')}
                              onChange={() => toggleRole('manager')}
                              className="rounded"
                            />
                            <span>매니저</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 rounded px-3 py-1 hover:bg-gray-100">
                            <input
                              type="checkbox"
                              checked={customRoles.includes('admin')}
                              onChange={() => toggleRole('admin')}
                              className="rounded"
                            />
                            <span>관리자</span>
                          </label>
                        </div>
                        <div className="mt-2 border-t pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetAudience('custom');
                              setCustomRolesOpen(false);
                            }}
                            className="w-full rounded-lg bg-blue-500 px-3 py-1 text-sm text-white"
                          >
                            적용
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                <span className="font-medium">예상 발송 대상:</span>{' '}
                {targetUserCount}명
              </div>
            </div>

            {/* 예약 발송 옵션 */}
            <div className="mb-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="rounded"
                />
                <span className="font-medium">예약 발송</span>
              </label>

              {isScheduled && (
                <div className="mt-3 grid gap-4 rounded-lg bg-gray-50 p-3 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="scheduleDate"
                      className="mb-1 block text-sm font-medium"
                    >
                      <Calendar className="mr-1 inline-block h-4 w-4" />
                      날짜
                    </label>
                    <input
                      id="scheduleDate"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                      required={isScheduled}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="scheduleTime"
                      className="mb-1 block text-sm font-medium"
                    >
                      <Clock className="mr-1 inline-block h-4 w-4" />
                      시간
                    </label>
                    <input
                      id="scheduleTime"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                      required={isScheduled}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 font-medium text-white transition hover:bg-gradient-to-l disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    <span>알림 발송 중...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 알림 정보 패널 */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">알림 가이드</h2>

            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="mb-2 flex items-center font-medium text-blue-800">
                  <Bell className="mr-2 h-5 w-5" />
                  일괄 알림이란?
                </h3>
                <p className="text-sm text-blue-700">
                  다수의 사용자에게 동시에 발송되는 알림으로, 공지사항이나 중요
                  업데이트를 전달할 때 사용합니다.
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-medium">알림 작성 팁</h3>
                <ul className="ml-5 list-disc space-y-1 text-sm text-gray-600">
                  <li>제목은 간결하고 명확하게 작성하세요.</li>
                  <li>
                    내용은 핵심 정보를 포함하되, 너무 길지 않게 작성하세요.
                  </li>
                  <li>예약 발송을 활용하여 적절한 시간에 알림을 발송하세요.</li>
                  <li>
                    필요한 경우에만 특정 대상을 선택하여 불필요한 알림을
                    줄이세요.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-yellow-50 p-4">
                <h3 className="mb-2 flex items-center font-medium text-yellow-800">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  주의사항
                </h3>
                <p className="text-sm text-yellow-700">
                  한 번 발송된 알림은 취소할 수 없습니다. 예약된 알림은 발송
                  전에 알림 관리 페이지에서 취소할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold">
              <Clock className="mr-2 h-5 w-5 text-gray-700" />
              예약 알림
            </h2>

            {/* 예약된 알림 목록 컴포넌트 자리 (추후 구현) */}
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
              현재 예약된 알림이 없습니다
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
