'use client';

import { Menu, User } from 'lucide-react';
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
        <nav className="flex w-full justify-between px-8">
          <div>
            <div>
              <Menu className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-gold-start to-gold-end bg-clip-text text-transparent">
            <Link href={'/'}>단무지</Link>
          </div>

          <div className="flex">
            {/* 알림 드롭다운 추가 */}
            <NotificationDropdown />

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
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Button onClick={() => setIsLoginModalOpen(true)}>로그인</Button>
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
