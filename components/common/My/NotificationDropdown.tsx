'use client';

import {
  NotificationRelatedData,
  useNotifications,
} from '@/hooks/useCertificate';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Award, Bell, Book, Check, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { MouseEvent, useEffect, useRef, useState } from 'react';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [hiddenNotifications, setHiddenNotifications] = useState<number[]>([]);

  // 바깥쪽 클릭시 드롭다운 닫기
  useEffect(() => {
    // MouseEvent 타입을 정확히 지정
    const handleClickOutside = (event: Event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 로컬 스토리지에서 숨김 처리된 알림 ID 불러오기
  useEffect(() => {
    const savedHidden = localStorage.getItem('hiddenNotifications');
    if (savedHidden) {
      try {
        setHiddenNotifications(JSON.parse(savedHidden));
      } catch (e) {
        console.error('Failed to parse hidden notifications:', e);
      }
    }
  }, []);

  // 알림 숨기기 처리
  const hideNotification = (id: number, e: MouseEvent) => {
    e.stopPropagation(); // 상위 클릭 이벤트 전파 방지

    const updatedHidden = [...hiddenNotifications, id];
    setHiddenNotifications(updatedHidden);

    // 로컬 스토리지에 저장
    localStorage.setItem('hiddenNotifications', JSON.stringify(updatedHidden));
  };

  // 알림 타입에 따른 아이콘
  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'course_added':
        return <Book className="h-5 w-5 text-blue-500" />;
      case 'certificate_issued':
        return <Award className="h-5 w-5 text-gold-start" />;
      case 'certificate_updated':
        return <RefreshCw className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = (
    notificationId: number,
    relatedData: NotificationRelatedData,
    type: string = ''
  ) => {
    markAsRead(notificationId);
    setIsOpen(false);

    // relatedData를 실제로 사용
    if (type === 'course_added' && relatedData && 'category' in relatedData) {
      // 새 강의가 추가된 경우 해당 카테고리 페이지로 이동
      window.location.href = `/course/${relatedData.category}`;
    } else if (
      type === 'certificate_issued' ||
      type === 'certificate_updated'
    ) {
      // 수료증 관련 알림은 수료증 페이지로 이동
      window.location.href = '/my/certificates';
    }
  };

  // 숨김 처리되지 않은 알림만 필터링
  const visibleNotifications = notifications.filter(
    (notification) => !hiddenNotifications.includes(notification.id)
  );

  // 읽지 않은 알림 개수 계산 [숨김 처리된 알림 제외]
  const visibleUnreadCount = visibleNotifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-1 hover:bg-gray-100"
      >
        <Bell className="h-6 w-6 text-gray-600" />
        {visibleUnreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {visibleUnreadCount > 9 ? '9+' : visibleUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="font-medium">알림</h3>
            {visibleUnreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                <Check className="h-4 w-4" />
                <span>모두 읽음</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                알림이 없습니다
              </div>
            ) : (
              <ul>
                {visibleNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`border-b transition-colors ${
                      notification.read ? 'bg-white' : 'bg-blue-50'
                    }`}
                  >
                    <div className="group relative">
                      <button
                        className="w-full text-left"
                        onClick={() =>
                          handleNotificationClick(
                            notification.id,
                            notification.related_data,
                            notification.type
                          )
                        }
                      >
                        <div className="flex items-start p-3">
                          <div className="mr-3 mt-1">
                            {renderNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-gray-600">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatDistanceToNow(
                                new Date(notification.created_at),
                                {
                                  addSuffix: true,
                                  locale: ko,
                                }
                              )}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="ml-2 h-2 w-2 rounded-full bg-blue-500"></div>
                          )}
                        </div>
                      </button>
                      {/* 숨기기 버튼 */}
                      <button
                        onClick={(e) => hideNotification(notification.id, e)}
                        className="absolute right-2 top-2 rounded-full p-1 opacity-0 transition-opacity hover:bg-gray-100 group-hover:opacity-100"
                        title="알림 숨기기"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {visibleNotifications.length > 0 && (
            <div className="border-t p-2">
              <Link
                href="/my/notifications"
                className="block w-full rounded-md p-2 text-center text-sm text-blue-600 hover:bg-blue-50"
                onClick={() => setIsOpen(false)}
              >
                모든 알림 보기
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
