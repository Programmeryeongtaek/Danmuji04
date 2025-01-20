'use client';

import './globals.css';
import Header from '@/components/common/Header';
import Navbar from '@/components/common/Navbar';
import { Toast } from '@/components/common/Toast';
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

const RootLayout = ({ children }: RootLayoutProps) => {
  const pathname = usePathname();
  const isLecturePage = pathname?.includes('/knowledge/lecture/');
  const isSignUpPage = pathname === '/signup';
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
          <div className="flex min-h-screen flex-col">
            <Header />
            <main>{children}</main>
            {!isLecturePage && <Navbar />}
          </div>
        </Toast.Provider>
      </body>
    </html>
  );
};

export default RootLayout;
