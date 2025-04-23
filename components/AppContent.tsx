'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import HomeSlide from './home/HomeSlide';
import Search from './home/Search';
import LoginModal from './home/LoginModal';

export default function AppContent() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('login') === 'true') {
      setIsLoginModalOpen(true);
    }
  }, [searchParams]);

  return (
    <div>
      <HomeSlide />
      <Search />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
