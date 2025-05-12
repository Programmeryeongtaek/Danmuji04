'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { createClient } from '@/utils/supabase/client';
import { createContext, ReactNode, useContext, useEffect } from 'react';

// 알림 관련 데이터 타입 정의
interface CourseAddedData {
  category: string;
  course_id: string;
  course_title: string;
}

interface CertificateData {
  category: string;
}

// 알림 타입에 따른 데이터 타입 정의
type NotificationRelatedData =
  | CourseAddedData
  | CertificateData
  | Record<string, unknown>;

// Notification 타입 직접 정의
interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'course_added' | 'certificate_issued' | 'certificate_updated';
  related_data: NotificationRelatedData;
  read: boolean;
  created_at: string;
}

// 알림 컨텍스트 인터페이스
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

// 기본값 생성
const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => false,
  markAllAsRead: async () => false,
  refresh: async () => {},
  isLoading: false,
});

// 알림 Provider 컴포넌트
export function NotificationProvider({ children }: { children: ReactNode }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
    isLoading,
  } = useNotifications();

  const contextValue: NotificationContextType = {
    notifications: notifications as Notification[],
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// 알림 컨텍스트 사용을 위한 커스텀 훅
export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}

// 실시간 알림 구독을 위한 훅
export function useNotificationSubscription() {
  const { refresh } = useNotificationContext();

  useEffect(() => {
    const supabase = createClient();

    async function setupSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 알림 테이블 변경 구독
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            refresh();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }

    const cleanup = setupSubscription();
    return () => {
      if (cleanup) {
        cleanup.then((unsub) => unsub && unsub());
      }
    };
  }, [refresh]);

  return null; // 이 훅은 사이드 이펙트만 있음
}
