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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        // 이미지 URL이 있는 경우 public URL 생성
        if (data.avatar_url) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('avatars').getPublicUrl(data.avatar_url);

          data.avatar_url = publicUrl;
        }

        setProfile(data);
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
                {/* TODO: 사진 이미지 변경하기기 */}
                <Image
                  src={'/images/danmuji.png'}
                  alt="단무지"
                  width={20}
                  height={20}
                />
                <span>단무지</span>
              </Link>
            </li>
            {/* TODO: 수직 구분선 */}
            <li>임시1</li>
          </ul>
          <ul className="flex items-center gap-1">
            <li>임시2</li>
            {/* TODO: 수직 구분선 */}
            <li>임시3</li>
          </ul>
        </header>
      </section>
      <header className="border-title sticky top-0 z-50 flex h-[50px] w-full items-center border-t bg-light">
        {/* TODO: navbar sticky 적용 */}
        <nav className="flex w-full justify-between px-8">
          <div>
            <div>
              {/* TODO: 누르면 왼쪽에서 슬라이드 열림*/}
              <Menu className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-gold-start to-gold-end bg-clip-text text-transparent">
            <Link href={'/'}>단무지</Link>
          </div>
          <div>
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

          {/* Right Side Bar */}
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
