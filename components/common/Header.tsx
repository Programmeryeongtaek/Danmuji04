'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import LoginModal from '../home/LoginModal';
import { useEffect, useState } from 'react';
import Button from './Button/Button';
import { useAtomValue } from 'jotai';
import { isLoadingAtom, userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { Profile } from '@/app/settings/profile/page';
import RightSideBar from './RightSideBar';
import NotificationDropdown from './My/NotificationDropdown';

const Header = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isRightSideBarOpen, setIsRightSideBarOpen] = useState(false);

  const user = useAtomValue(userAtom);
  const isLoading = useAtomValue(isLoadingAtom);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      const supabase = createClient();

      try {
        // 프로필 정보 가져오기
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        console.log('Profile data before URL:', profileData); // 디버깅 로그

        // avatar_url이 있는 경우 public URL 생성
        if (profileData?.avatar_url) {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(profileData.avatar_url);

          console.log('Generated public URL:', urlData.publicUrl); // URL 확인용 로그

          // 생성된 publicUrl로 profileData 업데이트
          profileData.avatar_url = urlData.publicUrl;
        }

        setProfile(profileData);
        console.log('Final profile data:', profileData); // 최종 데이터 확인
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <>
      <section className="flex h-10 w-full items-center">
        <header className="flex h-5 w-full justify-between px-8">
          <ul className="flex justify-between gap-1">
            <li className="flex justify-start">
              <Link
                href={'/introduce'}
                className="divide-y-black divide-black-200 flex gap-1"
              >
                <Image
                  src={'/images/danmuji.png'}
                  alt="단무지"
                  width={20}
                  height={20}
                />
                <span>단무지</span>
              </Link>
            </li>
            <li>임시1</li>
          </ul>
          <ul className="flex items-center gap-1">
            <li>임시2</li>
            <li>임시3</li>
          </ul>
        </header>
      </section>
      <header className="border-title sticky top-0 z-50 flex h-[50px] w-full items-center border-t bg-light">
        <nav className="flex w-full items-center justify-between px-4 md:px-8">
          {/* 왼쪽: 로고 및 네비게이션 링크 */}
          <div className="flex min-w-fit flex-shrink-0 items-center">
            {/* 모바일에서는 숨기고 데스크톱에서만 보이는 로고 */}
            <Link
              href="/"
              className="hidden whitespace-nowrap bg-gradient-to-r from-gold-start to-gold-end bg-clip-text text-transparent md:flex"
            >
              단무지
            </Link>

            {/* 데스크톱 메뉴 - 모바일에서는 숨김 */}
            <div className="ml-6 hidden items-center space-x-4 whitespace-nowrap md:flex md:space-x-4 lg:ml-10 lg:space-x-6">
              <Link
                href="/knowledge"
                className="text-gray-700 hover:text-gold-start"
              >
                지식
              </Link>
              <Link
                href="/course"
                className="text-gray-700 hover:text-gold-start"
              >
                코스
              </Link>
              <Link
                href="/study"
                className="text-gray-700 hover:text-gold-start"
              >
                스터디
              </Link>
              <Link
                href="/community"
                className="text-gray-700 hover:text-gold-start"
              >
                커뮤니티
              </Link>
            </div>
          </div>

          {/* 중앙 로고 - 모바일에서만 표시 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
            <Link
              href="/"
              className="bg-gradient-to-r from-gold-start to-gold-end bg-clip-text text-transparent"
            >
              단무지
            </Link>
          </div>

          {/* 가운데 꽉 차는 검색창 - 중간 크기 이상에서만 표시 */}
          <div className="mx-4 hidden w-full max-w-xl md:block">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="배우고 싶은 지식을 검색해보세요"
                className="w-full rounded-full bg-gray-100 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold-start"
              />
              <search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* 오른쪽: 대시보드, 알림, 프로필 */}
          <div className="flex min-w-fit flex-shrink-0 items-center space-x-3 md:space-x-4">
            <Link
              href="/dashboard"
              className="hidden whitespace-nowrap text-gray-700 hover:text-gold-start md:flex"
            >
              대시보드
            </Link>

            {/* 알림 드롭다운 추가 */}
            <div className="hidden md:block">
              <NotificationDropdown />
            </div>

            {isLoading ? (
              <span>로딩중...</span>
            ) : user ? (
              <div
                className="flex cursor-pointer items-center gap-2"
                onClick={() => setIsRightSideBarOpen(true)}
              >
                <div className="flex items-center gap-2">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="프로필 이미지"
                      width={32}
                      height={32}
                      className="h-8 w-8 min-w-[32px] rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full bg-gray-200">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setIsLoginModalOpen(true)}
                className="whitespace-nowrap px-3 py-1.5 text-sm"
              >
                로그인
              </Button>
            )}
          </div>

          <RightSideBar
            isOpen={isRightSideBarOpen}
            onClose={() => setIsRightSideBarOpen(false)}
            userProfile={profile}
            onLogout={handleLogout}
          />

          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
          />
        </nav>
      </header>
    </>
  );
};

export default Header;
