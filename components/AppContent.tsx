'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import HomeSlide from './home/HomeSlide';
import Search from './home/Search';
import LoginModal from './home/LoginModal';
import PopularCourses from './home/PopularCourses';
import AnnouncementSection from './home/AnnouncementSection';
import FeaturedBooks from './home/FeaturedBooks';
import Footer from './home/Footer';

export default function AppContent() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('login') === 'true') {
      setIsLoginModalOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col">
      <main>
        <HomeSlide />
        <Search />

        <div className="mx-auto py-8 mobile:px-6 tablet:px-8 laptop:px-10">
          {/* 공지사항 섹션 */}
          <AnnouncementSection />

          {/* 인기 코스 섹션 */}
          <div className="my-12">
            <PopularCourses />
          </div>

          {/* 인기 추천 도서 섹션 */}
          <div className="my-12">
            <FeaturedBooks />
          </div>
        </div>
      </main>

      {/* Footer는 태블릿과 데스크탑에서만 보임 */}
      <div className="hidden tablet:block">
        <Footer />
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
