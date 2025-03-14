'use client';

import { useNotifications } from '@/hooks/useCertificate';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Award, Bell, Book, Check, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { MouseEvent, useEffect, useRef, useState } from 'react';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  // 바깥쪽 클릭시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
    relatedData: any
  ) => {
    markAsRead(notificationId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-1 hover:bg-gray-100"
      >
        <Bell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="font-medium">알림</h3>
            {unreadCount > 0 && (
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
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                알림이 없습니다
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`border-b transition-colors ${
                      notification.read ? 'bg-white' : 'bg-blue-50'
                    }`}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() =>
                        handleNotificationClick(
                          notification.id,
                          notification.related_data
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
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t p-2">
              <Link
                href="/notifications"
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
