import Header from '@/components/common/Header';
import Navbar from '@/components/common/Navbar';
import { ReactNode } from 'react';

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="ko">
      <body className="h-full bg-light">
        <div>
          <Header />
          <main>{children}</main>
          <Navbar />
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
