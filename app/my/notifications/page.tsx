'use client';

import Button from '@/components/common/Button/Button';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/components/common/Toast/Context';
import { COURSE_CATEGORIES } from '@/app/types/course/categories';
import {
  Award,
  Bell,
  Book,
  Check,
  ExternalLink,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function NotificationPage() {
  const {
    notifications,
    isLoading,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    markNotificationForDeletion,
    cancelNotificationDeletion,
  } = useNotifications();

  const [timers, setTimers] = useState<Record<number, NodeJS.Timeout>>({});
  const mountedRef = useRef(true);
  const { showToast } = useToast();

  // 컴포넌트 마운트/언마운트 관리
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      // 모든 타이머 정리
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, [timers]);

  // 삭제 예정 알림에 대한 타이머 설정
  useEffect(() => {
    const newTimers: Record<number, NodeJS.Timeout> = {};

    notifications.forEach((notification) => {
      if (
        timers[notification.id] ||
        !notification.pending_delete ||
        !notification.delete_at
      ) {
        return;
      }

      const deleteTime = new Date(notification.delete_at).getTime();
      const now = new Date().getTime();
      const timeUntilDelete = deleteTime - now;

      if (timeUntilDelete > 0) {
        newTimers[notification.id] = setTimeout(() => {
          if (mountedRef.current) {
            // 타이머 정리 - 실제 삭제는 서버에서 처리되며 realtime으로 알림 받음
            setTimers((prev) => {
              const updated = { ...prev };
              delete updated[notification.id];
              return updated;
            });
          }
        }, timeUntilDelete);
      }
    });

    if (Object.keys(newTimers).length > 0) {
      setTimers((prev) => ({ ...prev, ...newTimers }));
    }
  }, [notifications]);

  // 알림 읽음 처리
  const handleMarkAsRead = async (notificationId: number) => {
    const success = await markNotificationAsRead(notificationId);
    if (success) {
      showToast('알림을 읽음 처리했습니다.', 'success');
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    const success = await markAllNotificationsAsRead();
    if (success) {
      showToast('모든 알림을 읽음 처리했습니다.', 'success');
    }
  };

  // 알림 삭제 (30분 지연 삭제)
  const handleDelete = async (notificationId: number) => {
    // 타이머가 이미 있으면 제거
    if (timers[notificationId]) {
      clearTimeout(timers[notificationId]);
      setTimers((prev) => {
        const updated = { ...prev };
        delete updated[notificationId];
        return updated;
      });
    }

    const success = await markNotificationForDeletion(notificationId, 30);
    if (success) {
      showToast('30분 후에 알림이 자동으로 삭제됩니다.', 'info');
    }
  };

  // 삭제 취소
  const handleCancelDeletion = async (notificationId: number) => {
    // 타이머가 있으면 제거
    if (timers[notificationId]) {
      clearTimeout(timers[notificationId]);
      setTimers((prev) => {
        const updated = { ...prev };
        delete updated[notificationId];
        return updated;
      });
    }

    const success = await cancelNotificationDeletion(notificationId);
    if (success) {
      showToast('알림 삭제가 취소되었습니다.', 'success');
    }
  };

  // 모든 알림 삭제 (개별 삭제로 구현)
  const handleDeleteAll = async () => {
    if (!confirm('모든 알림을 삭제하시겠습니까?')) return;

    // 모든 타이머 정리
    Object.values(timers).forEach((timer) => clearTimeout(timer));
    setTimers({});

    // 각 알림을 개별적으로 삭제 예약
    let successCount = 0;
    for (const notification of notifications) {
      try {
        await markNotificationForDeletion(notification.id, 1); // 1분 후 삭제
        successCount++;
      } catch (error) {
        console.error(`알림 ${notification.id} 삭제 실패:`, error);
      }
    }

    if (successCount > 0) {
      showToast(
        `${successCount}개 알림이 1분 후 삭제 예약되었습니다.`,
        'success'
      );
    } else {
      showToast('알림 삭제에 실패했습니다.', 'error');
    }
  };

  // 삭제까지 남은 시간 계산
  const getTimeRemaining = (deleteTimeStr: string): string => {
    const now = new Date();
    const deleteTime = new Date(deleteTimeStr);
    const diffMs = deleteTime.getTime() - now.getTime();

    if (diffMs <= 0) return '잠시 후 삭제됩니다';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return '1분 이내 삭제';
    return `${diffMinutes}분 후 삭제`;
  };

  // 알림 아이콘 렌더링
  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'course_added':
        return <Book className="h-6 w-6 text-blue-500" />;
      case 'certificate_issued':
        return <Award className="h-6 w-6 text-gold-start" />;
      case 'certificate_updated':
        return <RefreshCw className="h-6 w-6 text-green-500" />;
      default:
        return <Bell className="h-6 w-6 text-gray-500" />;
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <h1 className="mb-6 text-2xl font-bold">알림</h1>
        <div className="py-8 text-center">알림을 불러오는 중...</div>
      </div>
    );
  }

  // 읽지 않은 알림 수 계산
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">알림</h1>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 px-4 py-1 text-sm"
            >
              <Check className="h-4 w-4" />
              모두 읽음
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              onClick={handleDeleteAll}
              className="flex items-center gap-1 bg-red-500 px-4 py-1 text-sm hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4" />
              모두 삭제
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <Bell className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h2 className="text-lg font-medium text-gray-600">알림이 없습니다</h2>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`relative rounded-lg border p-4 transition-colors ${
                notification.read ? 'bg-white' : 'bg-blue-50'
              } ${notification.pending_delete ? 'border-red-200 bg-red-50' : ''}`}
            >
              <div className="flex items-start">
                {/* 알림 아이콘 */}
                <div className="mr-4 rounded-full bg-gray-100 p-2">
                  {renderNotificationIcon(notification.type)}
                </div>

                <div className="flex-1">
                  <h3 className="font-medium">{notification.title}</h3>
                  <p className="text-gray-600">{notification.message}</p>

                  {/* 코스 추가 알림 관련 추가 정보 */}
                  {notification.type === 'course_added' &&
                    notification.related_data &&
                    'category' in notification.related_data && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                          {COURSE_CATEGORIES[
                            notification.related_data
                              .category as keyof typeof COURSE_CATEGORIES
                          ]?.title || notification.related_data.category}
                        </span>
                        <Link
                          href={`/course/${notification.related_data.category}`}
                          className="flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                        >
                          <ExternalLink className="h-3 w-3" />
                          강의 확인하기
                        </Link>
                      </div>
                    )}

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>

                    <div className="flex gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex items-center gap-1 rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                        >
                          <Check className="h-4 w-4" />
                          읽음
                        </button>
                      )}

                      {notification.pending_delete ? (
                        <button
                          onClick={() => handleCancelDeletion(notification.id)}
                          className="flex items-center gap-1 rounded px-3 py-1 text-sm text-green-600 hover:bg-green-50"
                        >
                          <X className="h-4 w-4" />
                          삭제 취소
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="flex items-center gap-1 rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 삭제 예정 시간 표시 */}
              {notification.pending_delete && notification.delete_at && (
                <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-600">
                  {getTimeRemaining(notification.delete_at)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
