'use client';

import './globals.css';
import Header from '@/components/common/Header';
import Navbar from '@/components/common/Navbar';
import { Toast } from '@/components/common/Toast';
import {
  NotificationProvider,
  useNotificationSubscription,
} from '@/components/Course/NotificationContext';
import { isLoadingAtom, userAtom } from '@/store/auth';
import { initializeLectureBookmarksAtom } from '@/store/lecture/bookmarkAtom';
import { initializeNotificationsAtom } from '@/store/notification/notificationAtom';
import { initializeBookmarksAtom } from '@/store/study/bookmarkAtom';
import { initializeParticipationAtom } from '@/store/study/participationAtom';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { useAtom, useSetAtom } from 'jotai';
import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import { ReactNode, useCallback, useEffect, useRef } from 'react';

interface RootLayoutProps {
  children: ReactNode;
}

const inter = Inter({ subsets: ['latin'] });

// 알림 구독을 처리하는 래퍼 컴포넌트
function NotificationSubscriptionWrapper({
  children,
}: {
  children: ReactNode;
}) {
  // 알림 실시간 구독 설정
  useNotificationSubscription();
  return <>{children}</>;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  const pathname = usePathname();
  const isLecturePage = pathname?.includes('/knowledge/lecture/');
  const isSettingsPage = pathname?.includes('/settings/');
  const isSignUpPage = pathname === '/signup';
  const lectureCreate = pathname === '/my/lectureCreate';
  const editLecture = pathname === '/my/lectures/[id]/edit';
  const learning = pathname === '/my/learning';
  const isCoursePage = pathname?.includes('/course/');
  const studyPage = pathname?.includes('/study');
  const communityPostPage = pathname?.includes('/community/post/');
  const communityCreatePage = pathname?.includes('/community/write');

  const setUser = useSetAtom(userAtom);
  const setIsLoading = useSetAtom(isLoadingAtom);
  const [, initializeBookmarks] = useAtom(initializeBookmarksAtom);
  const [, initializeParticipation] = useAtom(initializeParticipationAtom);
  const [, initializeLectureBookmarks] = useAtom(
    initializeLectureBookmarksAtom
  );
  const [, initializeNotifications] = useAtom(initializeNotificationsAtom);

  // 초기화 상태를 추적하는 ref
  const initializationRef = useRef<{
    isInitializing: boolean;
    lastUserId: string | null;
  }>({
    isInitializing: false,
    lastUserId: null,
  });

  // 상태 초기화 함수 - useCallback으로 메모이제이션
  const initializeAllStates = useCallback(
    async (user: User | null) => {
      const currentUserId = user?.id || null;

      // 이미 초기화 중이거나 같은 사용자에 대해 초기화 완료된 경우 스킵
      if (
        initializationRef.current.isInitializing ||
        initializationRef.current.lastUserId === currentUserId
      ) {
        return;
      }

      try {
        initializationRef.current.isInitializing = true;

        if (user) {
          await Promise.all([
            initializeBookmarks(),
            initializeParticipation(),
            initializeLectureBookmarks(),
            initializeNotifications(),
          ]);
        } else {
          // 로그아웃 시에는 빈 상태로 초기화
          await Promise.all([
            initializeBookmarks(),
            initializeParticipation(),
            initializeLectureBookmarks(),
            initializeNotifications(),
          ]);
        }

        initializationRef.current.lastUserId = currentUserId;
      } catch (error) {
        console.error('상태 초기화 중 오류 발생:', error);
      } finally {
        initializationRef.current.isInitializing = false;
      }
    },
    [
      initializeBookmarks,
      initializeParticipation,
      initializeLectureBookmarks,
      initializeNotifications,
    ]
  );

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    // 초기 세션 체크 및 상태 초기화
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user || null;

        if (isMounted) {
          setUser(user);
          await initializeAllStates(user);
        }
      } catch (error) {
        console.error('인증 초기화 중 오류:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // 인증 상태 변화 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      const user = session?.user || null;
      setUser(user);

      // 로그인/로그아웃 시에만 상태 초기화
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // 이전 초기화 상태 리셋
        initializationRef.current.lastUserId = null;
        initializeAllStates(user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      // 초기화 상태 리셋
      initializationRef.current = {
        isInitializing: false,
        lastUserId: null,
      };
    };
  }, [setUser, setIsLoading, initializeAllStates]);

  if (isSignUpPage) {
    return (
      <html lang="ko">
        <body className={inter.className}>{children}</body>
      </html>
    );
  }

  return (
    <html lang="ko">
      <body className={inter.className}>
        <Toast.Provider>
          <NotificationProvider>
            <NotificationSubscriptionWrapper>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="pb-[60px] mobile:pb-0">{children}</main>
                {!isLecturePage &&
                  !isSettingsPage &&
                  !lectureCreate &&
                  !editLecture &&
                  !learning &&
                  !isCoursePage &&
                  !studyPage &&
                  !communityPostPage &&
                  !communityCreatePage && <Navbar />}
              </div>
            </NotificationSubscriptionWrapper>
          </NotificationProvider>
        </Toast.Provider>
      </body>
    </html>
  );
};

export default RootLayout;
