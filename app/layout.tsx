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
import { createClient } from '@/utils/supabase/client';
import { useSetAtom } from 'jotai';
import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

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
  const setUser = useSetAtom(userAtom);
  const setIsLoading = useSetAtom(isLoadingAtom);

  useEffect(() => {
    const supabase = createClient();

    // 초기 세션 체크
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // 인증 상태 변화 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user);
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setIsLoading]);

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
                <main className="pb-[60px] md:pb-0">{children}</main>
                {!isLecturePage &&
                  !isSettingsPage &&
                  !lectureCreate &&
                  !editLecture &&
                  !learning &&
                  !isCoursePage && <Navbar />}
              </div>
            </NotificationSubscriptionWrapper>
          </NotificationProvider>
        </Toast.Provider>
      </body>
    </html>
  );
};

export default RootLayout;
