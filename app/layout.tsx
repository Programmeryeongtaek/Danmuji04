'use client';

import './globals.css';
import Header from '@/components/common/Header';
import Navbar from '@/components/common/Navbar';
import { Toast } from '@/components/common/Toast';
import {
  NotificationProvider,
  useNotificationSubscription,
} from '@/components/Course/NotificationContext';
import { queryClient } from '@/lib/queryClient';
import { isLoadingAtom, userAtom } from '@/store/auth';
import { initializeCourseProgressAtom } from '@/store/course/progressAtom';
import { initializeUserProfileAtom } from '@/store/my/userProfileAtom';
import { initializeNotificationsAtom } from '@/store/notification/notificationAtom';
import { initializeParticipationAtom } from '@/store/study/participationAtom';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
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
  const initializeUserProfile = useSetAtom(initializeUserProfileAtom);
  const [, initializeParticipation] = useAtom(initializeParticipationAtom);
  const [, initializeNotifications] = useAtom(initializeNotificationsAtom);
  const [, initializeCourseProgress] = useAtom(initializeCourseProgressAtom);

  // 초기화 상태를 추적하는 ref
  const initializationRef = useRef<{
    isInitializing: boolean;
    lastUserId: string | undefined;
  }>({
    isInitializing: false,
    lastUserId: undefined,
  });

  // 상태 초기화 함수 - useCallback으로 메모이제이션
  const initializeAllStates = useCallback(
    async (user: User | null) => {
      // 이미 초기화 중이거나 같은 사용자에 대해 초기화 완료된 경우 스킵
      if (
        initializationRef.current.isInitializing ||
        initializationRef.current.lastUserId === user?.id
      ) {
        return;
      }

      initializationRef.current.isInitializing = true;
      initializationRef.current.lastUserId = user?.id;

      try {
        if (user) {
          await initializeUserProfile(user.id);
          await Promise.all([
            initializeParticipation(),
            initializeNotifications(),
            initializeCourseProgress(),
          ]);
        } else {
          // 로그아웃 시에는 빈 상태로 초기화
          await initializeUserProfile('');
          await Promise.all([
            initializeParticipation(),
            initializeNotifications(),
            initializeCourseProgress(),
          ]);
        }
      } catch (error) {
        console.error('상태 초기화 중 오류 발생:', error);
      } finally {
        initializationRef.current.isInitializing = false;
      }
    },
    [
      setIsLoading,
      initializeUserProfile,
      initializeParticipation,
      initializeNotifications,
      initializeCourseProgress,
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
        initializationRef.current.lastUserId = undefined;
        initializeAllStates(user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      // 초기화 상태 리셋
      initializationRef.current = {
        isInitializing: false,
        lastUserId: undefined,
      };
    };
  }, [setUser, setIsLoading, initializeAllStates]);

  if (isSignUpPage) {
    return (
      <html lang="ko">
        <body className={inter.className}>
          {/* 회원가입 페이지도 QueryClient로 감싸기 */}
          <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* QueryClientProvider로 전체 앱을 감싸기 */}
        <QueryClientProvider client={queryClient}>
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
          {/* ReactQuery DevTools 추가 */}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
