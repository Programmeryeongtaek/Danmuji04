'use client';

import LoginModal from '@/components/home/LoginModal';
import './globals.css';
import HomeSlide from '@/components/home/HomeSlide';
import Search from '@/components/home/Search';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const App = () => {
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
};
export default App;
