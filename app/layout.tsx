'use client';

import './globals.css';
import Header from '@/components/common/Header';
import Navbar from '@/components/common/Navbar';
import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface RootLayoutProps {
  children: ReactNode;
}

const inter = Inter({ subsets: ['latin'] });

const RootLayout = ({ children }: RootLayoutProps) => {
  const pathname = usePathname();
  const isSignUpPage = pathname === '/signup';

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
        <div className="flex min-h-screen flex-col">
          <Header />
          <main>{children}</main>
          <Navbar />
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
