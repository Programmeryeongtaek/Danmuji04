'use client';

import { useNotifications } from '@/hooks/useCertificate';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Award, Bell, Book, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { MouseEvent, useEffect, useRef, useState } from 'react';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead } = useNotifications();
  // 드롭다운에서만 숨길 알림 ID 목록
  const [hiddenInDropdown, setHiddenInDropdown] = useState<number[]>([]);

  // 로컬 스토리지에서 숨겨진 알림 ID 불러오기
  useEffect(() => {
    const savedHidden = localStorage.getItem('hiddenNotificationsInDropdown');
    if (savedHidden) {
      try {
        setHiddenInDropdown(JSON.parse(savedHidden));
      } catch (e) {
        console.error('Failed to parse hidden notifications:', e);
      }
    }
  }, []);

  // 바깥쪽 클릭시 드롭다운 닫기
  useEffect(() => {
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

  // 드롭다운에서만 알림 숨기기
  const hideFromDropdown = (id: number, e: MouseEvent) => {
    e.stopPropagation(); // 상위 클릭 이벤트 전파 방지

    const updatedHidden = [...hiddenInDropdown, id];
    setHiddenInDropdown(updatedHidden);
    localStorage.setItem(
      'hiddenNotificationsInDropdown',
      JSON.stringify(updatedHidden)
    );
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

  const handleNotificationClick = (notificationId: number) => {
    markAsRead(notificationId);
    setIsOpen(false);
  };

  // 드롭다운에 표시될 알림 필터링 (숨겨진 알림 제외)
  const visibleNotifications = notifications.filter(
    (notification) => !hiddenInDropdown.includes(notification.id)
  );

  // 읽지 않은 알림 개수 계산 (숨겨진 알림 제외)
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
                    <div className="relative flex items-start p-3">
                      {/* 알림 내용 부분 */}
                      <div className="mr-3 mt-1">
                        {renderNotificationIcon(notification.type)}
                      </div>
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleNotificationClick(notification.id)}
                      >
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

                      {/* 읽지 않은 알림 표시 */}
                      {!notification.read && (
                        <div className="ml-2 h-2 w-2 rounded-full bg-blue-500"></div>
                      )}

                      {/* X 버튼 - 항상 표시되도록 수정 */}
                      <button
                        onClick={(e) => hideFromDropdown(notification.id, e)}
                        className="ml-2 flex-shrink-0 rounded-full p-1 hover:bg-gray-100"
                        title="드롭다운에서 숨기기"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
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
