import Button from '@/components/common/Button/Button';
import { useNotifications } from '@/hooks/useCertificate';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Award, Bell, Book, Check, RefreshCw } from 'lucide-react';

export default function NotificationPage() {
  const { notifications, isLoading, markAsRead, markAllAsRead } =
    useNotifications();

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
              className={`rounded-lg border p-4 transition-colors ${
                notification.read ? 'bg-white' : 'bg-blue-50'
              }`}
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
                  <div className="flex justify-between">
                    <h3 className="font-medium">{notification.title}</h3>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  </div>
                  <p className="text-gray-600">{notification.message}</p>

                  {!notification.read && (
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="flex items-center gap-1 rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                      >
                        <Check className="h-4 w-4" />
                        읽음 표시
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
