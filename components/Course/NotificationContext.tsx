'use client';

import { NotificationContextType } from '@/app/types/notificationTypes';
import { useNotifications } from '@/hooks/useNotifications';
import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import { createContext, ReactNode, useContext, useEffect, useRef } from 'react';

// 컨텍스트 생성 (선택적 사용 - 대부분 useNotifications 훅을 직접 사용)
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// 알림 Provider 컴포넌트
export function NotificationProvider({ children }: { children: ReactNode }) {
  // 실제 알림 관리는 useNotifications 훅에서 처리하므로
  // 여기서는 최소한의 컨텍스트만 제공 (주로 useNotifications 훅 사용 권장)
  const contextValue = {} as NotificationContextType;

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// 컨텍스트 사용 훅 (선택적 사용 - useNotifications 훅 사용 권장)
export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}

// 실시간 알림 구독을 처리하는 훅
export function useNotificationSubscription() {
  const user = useAtomValue(userAtom);
  const { initialize, startRealtimeSubscription } = useNotifications();
  const cleanupRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // 사용자가 로그인한 경우에만 초기화 및 구독
    if (user && !isInitializedRef.current) {
      const initializeAndSubscribe = async () => {
        try {
          // 1. 알림 데이터 초기화
          await initialize();

          // 2. 실시간 구독 시작
          const cleanup = await startRealtimeSubscription();
          cleanupRef.current = cleanup;

          isInitializedRef.current = true;
        } catch (error) {
          console.error('알림 시스템 초기화 실패:', error);
        }
      };

      initializeAndSubscribe();
    }

    // 사용자가 로그아웃한 경우 정리
    if (!user && isInitializedRef.current) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      isInitializedRef.current = false;
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [user, initialize, startRealtimeSubscription]);

  // 페이지 언로드 시에도 정리
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
