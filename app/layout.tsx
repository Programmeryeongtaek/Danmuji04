import Header from '@/components/common/Header';
import { ReactNode } from 'react';

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="ko">
      <body>
        <div>
          <Header />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
