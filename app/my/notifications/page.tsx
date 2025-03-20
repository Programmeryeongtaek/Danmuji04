'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import { useNotifications } from '@/hooks/useCertificate';
import { COURSE_CATEGORIES } from '@/types/course/categories';
import {
  cancelNotificationDeletion,
  markNotificationForDeletion,
} from '@/utils/services/certificateService';
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

export default function NotificationPage() {
  const { notifications, isLoading, markAsRead, markAllAsRead, refresh } =
    useNotifications();
  const { showToast } = useToast();

  // 알림 삭제 요청
  const markForDeletion = async (notificationId: number) => {
    try {
      const success = await markNotificationForDeletion(notificationId);
      if (success) {
        showToast('1시간 후에 알림이 삭제됩니다.', 'info');
        refresh(); // 데이터 다시 불러오기
      } else {
        showToast('알림 삭제 예약에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('알림 삭제 예약 중 오류:', error);
      showToast('오류가 발생했습니다', 'error');
    }
  };

  // 삭제 취소
  const cancelDeletion = async (notificationId: number) => {
    try {
      const success = await cancelNotificationDeletion(notificationId);
      if (success) {
        showToast('알림 삭제가 취소되었습니다.', 'success');
        refresh(); // 데이터 다시 불러오기
      } else {
        showToast('삭제 취소에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('삭제 취소 중 오류:', error);
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  // 남은 시간 계산
  const getTimeRemaining = (deleteTime: string): string => {
    const now = new Date();
    const deleteAt = new Date(deleteTime);
    const diffMs = deleteAt.getTime() - now.getTime();

    if (diffMs <= 0) return '잠시 후 삭제됩니다';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return '1분 이내 삭제';
    if (diffMinutes < 60) return `${diffMinutes}분 후 삭제`;

    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;

    return `${diffHours}시간 ${remainingMinutes}분 후 삭제`;
  };

  if (isLoading) {
    return <div className="py-8 text-center">알림을 불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">알림</h1>
        {notifications.some((n) => !n.read) && (
          <Button
            onClick={markAllAsRead}
            className="flex items-center gap-1 px-4 py-1 text-sm"
          >
            <Check className="h-4 w-4" />
            모두 읽음
          </Button>
        )}
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
                {/* 알림 타입에 따른 아이콘 */}
                <div className="mr-4 rounded-full bg-gray-100 p-2">
                  {notification.type === 'course_added' ? (
                    <Book className="h-6 w-6 text-blue-500" />
                  ) : notification.type === 'certificate_issued' ? (
                    <Award className="h-6 w-6 text-gold-start" />
                  ) : notification.type === 'certificate_updated' ? (
                    <RefreshCw className="h-6 w-6 text-green-500" />
                  ) : (
                    <Bell className="h-6 w-6 text-gray-500" />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-medium">{notification.title}</h3>
                  <p className="text-gray-600">{notification.message}</p>

                  {/* 알림 타입별 추가 정보 및 액션 버튼 */}
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
                          onClick={() => markAsRead(notification.id)}
                          className="flex items-center gap-1 rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                        >
                          <Check className="h-4 w-4" />
                          읽음
                        </button>
                      )}

                      {notification.pending_delete ? (
                        <button
                          onClick={() => cancelDeletion(notification.id)}
                          className="flex items-center gap-1 rounded px-3 py-1 text-sm text-green-600 hover:bg-green-50"
                        >
                          <X className="h-4 w-4" />
                          삭제 취소
                        </button>
                      ) : (
                        <button
                          onClick={() => markForDeletion(notification.id)}
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

              {/* 삭제 예정 표시 */}
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
