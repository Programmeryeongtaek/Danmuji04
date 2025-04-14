'use client';

import { Search, SearchIcon, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import LoginModal from '../home/LoginModal';
import { FormEvent, useEffect, useState } from 'react';
import Button from './Button/Button';
import { useAtomValue, useSetAtom } from 'jotai';
import { isLoadingAtom, userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { Profile } from '@/app/settings/profile/page';
import RightSideBar from './RightSideBar';
import NotificationDropdown from '../My/NotificationDropdown';
import { COURSE_CATEGORIES, CourseCategory } from '@/types/course/categories';
import NavDropdown from '../NavDropdown';
import { useRouter } from 'next/navigation';

interface DropdownItem {
  id: string;
  label: string;
  href: string;
}

const Header = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isRightSideBarOpen, setIsRightSideBarOpen] = useState(false);

  // 카테고리 상태
  const [knowledgeItems, setKnowledgeItems] = useState<DropdownItem[]>([]);
  const [courseItems, setCourseItems] = useState<DropdownItem[]>([]);
  const [studyItems, setStudyItems] = useState<DropdownItem[]>([]);
  const [communityItems, setCommunityItems] = useState<DropdownItem[]>([]);

  const router = useRouter();
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);
  const isLoading = useAtomValue(isLoadingAtom);

  // 검색 기능
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 코스 카테고리 로드
  useEffect(() => {
    // 코스 카테고리 변환 (정적으로 import된 데이터 사용)
    const courseDropdownItems = Object.keys(COURSE_CATEGORIES).map((key) => {
      const category = COURSE_CATEGORIES[key as CourseCategory];
      return {
        id: category.id,
        label: category.title,
        href: `/course/${category.id}`,
      };
    });

    setCourseItems(courseDropdownItems);
  }, []);

  // 지식 카테고리 로드
  useEffect(() => {
    // 지식 카테고리는 서버에서 가져오거나 동적으로 생성
    // Category.tsx에서 사용하는 카테고리 정보 활용
    const knowledgeDropdownItems = [
      {
        id: 'humanities',
        label: '인문학',
        href: '/knowledge?category=humanities',
      },
      {
        id: 'philosophy',
        label: '철학',
        href: '/knowledge?category=philosophy',
      },
      {
        id: 'psychology',
        label: '심리학',
        href: '/knowledge?category=psychology',
      },
      {
        id: 'economics',
        label: '경제학',
        href: '/knowledge?category=economics',
      },
      {
        id: 'self-development',
        label: '자기계발',
        href: '/knowledge?category=self-development',
      },
      {
        id: 'leadership',
        label: '리더십',
        href: '/knowledge?category=leadership',
      },
    ];

    setKnowledgeItems(knowledgeDropdownItems);
  }, []);

  // 스터디 카테고리 로드
  useEffect(() => {
    const studyDropdownItems = [
      { id: 'square', label: '광장', href: '/study?category=square' },
      { id: 'book', label: '도서', href: '/study?category=book' },
    ];

    setStudyItems(studyDropdownItems);
  }, []);

  // 커뮤니티 카테고리 로드
  useEffect(() => {
    const communityDropdownItems = [
      { id: 'notice', label: '공지사항', href: '/community?category=notice' },
      { id: 'chats', label: '자유게시판', href: '/community?category=chats' },
      { id: 'faq', label: '질문 게시판', href: '/community?category=faq' },
    ];

    setCommunityItems(communityDropdownItems);
  }, []);

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
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        `/knowledge?category=search&q=${encodeURIComponent(searchQuery)}`
      );
      setIsSearchOpen(false);
      setSearchQuery('');
    }
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
            <span>｜</span>
            <li>
              <Link
                href={'/introduce'}
                className="text-sm hover:text-gold-start"
              >
                소개
              </Link>
            </li>
          </ul>
          <ul className="flex items-center gap-1">
            <li>
              <Link
                href="/instructor/register"
                className="text-sm hover:text-gold-start"
              >
                강사등록
              </Link>
            </li>
            <span>｜</span>
            <li>
              <Link href="/contact" className="text-sm hover:text-gold-start">
                문의하기
              </Link>
            </li>
          </ul>
        </header>
      </section>

      {/* 모바일 검색 입력창 */}
      {isSearchOpen && (
        <div className="fixed inset-x-0 top-0 z-[100] bg-white p-4 shadow-md md:hidden">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어를 입력하세요"
              className="w-full rounded-full border border-gray-300 bg-gray-100 py-2 pl-4 pr-10 focus:border-gold-start focus:outline-none"
              autoFocus
            />
            <div className="absolute right-0 top-0 flex h-full items-center">
              <button type="submit" className="px-3 text-gray-500">
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="px-3 text-gray-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <header className="border-title sticky top-0 z-50 flex h-[50px] w-full items-center border-t bg-light">
        <nav className="flex w-full items-center justify-between px-4 md:px-8">
          {/* 왼쪽: 로고 및 네비게이션 링크 */}
          <div className="flex min-w-fit flex-shrink-0 items-center">
            {/* 모바일에서만 표시되는 검색 버튼 */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="mr-3 text-gray-700"
            >
              <Search className="h-5 w-5 md:hidden" />
            </button>

            {/* 모바일에서는 숨기고 데스크톱에서만 보이는 로고 */}
            <Link
              href="/"
              className="hidden whitespace-nowrap bg-gradient-to-r from-gold-start to-gold-end bg-clip-text text-transparent md:flex"
            >
              단무지
            </Link>

            {/* 데스크톱 메뉴 - 모바일에서는 숨김 */}
            <div className="ml-6 hidden items-center space-x-4 whitespace-nowrap md:ml-10 md:flex md:space-x-6">
              {/* 지식 드롭다운 */}
              <NavDropdown
                title="지식"
                href="/knowledge"
                items={knowledgeItems}
              />

              {/* 코스 드롭다운 */}
              <NavDropdown title="코스" href="/course" items={courseItems} />

              {/* 스터디 드롭다운 */}
              <NavDropdown title="스터디" href="/study" items={studyItems} />

              {/* 커뮤니티 드롭다운 */}
              <NavDropdown
                title="커뮤니티"
                href="/community"
                items={communityItems}
              />
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
                placeholder="배우고 싶은 지식을 검색해보세요."
                className="w-full rounded-full bg-gray-100 py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gold-start"
              />
              <SearchIcon className="absolute right-4 top-2" />
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

            {/* 알림 드롭다운 - 데스크톱과 모바일 모두 표시 */}
            {user && (
              <div className="flex items-center">
                <NotificationDropdown />
              </div>
            )}

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
