'use client';

import {
  Bell,
  Bookmark,
  BookOpen,
  GraduationCap,
  Heart,
  Settings,
  Shield,
  User,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import Button from './Button/Button';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface RightSideBarProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: {
    avatar_url?: string | null;
    nickname?: string | null;
    name: string | null;
    email: string | null;
    role?: string | null; // role 속성 추가
  } | null;
  onLogout: () => void;
}

// 일반 메뉴 아이템
const menuItems = [
  // 학습 관련 메뉴
  { icon: BookOpen, label: '수강 강의', href: '/my/learning' },
  // { icon: Video, label: '이어서 학습하기', href: '/' },
  { icon: Heart, label: '찜한 강의', href: '/my/wishlist' },
  { icon: Bookmark, label: '게시글 북마크', href: '/my/bookmarks' },
  { icon: BookOpen, label: '작성한 내용', href: '/my/writings' },
  { icon: GraduationCap, label: '수료증', href: '/my/certificates' },

  // 스터디 관련 메뉴
  { icon: Users, label: '내 스터디', href: '/my/studies' },
  { icon: Bookmark, label: '스터디 북마크', href: '/my/study-bookmarks' },

  // 기타 메뉴
  { icon: Bell, label: '알림', href: '/my/notifications' },
  { icon: Settings, label: '설정', href: '/settings' },
];

// 관리자 메뉴 아이템
const adminMenuItems = [
  { icon: Shield, label: '관리자 대시보드', href: '/admin' },
  { icon: Users, label: '사용자 관리', href: '/admin/user-roles' },
  { icon: Bell, label: '알림 관리', href: '/admin/notifications' },
];

const RightSideBar = ({
  isOpen,
  onClose,
  userProfile,
  onLogout,
}: RightSideBarProps) => {
  const [isAdmin, setIsAdmin] = useState(false);

  // 사용자의 관리자 권한 확인
  useEffect(() => {
    // 프로필 정보에서 role 확인
    if (userProfile?.role === 'admin') {
      setIsAdmin(true);
    }
  }, [userProfile]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-60 transform overflow-y-auto bg-white transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Slider Header */}
        <button className="p-3">
          <X className="h-4 w-4" onClick={onClose} />
        </button>

        {/* User Profile Section */}
        <div className="border-b px-3 pb-4 pt-2">
          <div className="flex items-center gap-3">
            {userProfile?.avatar_url ? (
              <Image
                src={userProfile.avatar_url}
                alt="프로필 이미지"
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                <User className="h-6 w-6 text-gray-500" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-medium">
                {userProfile?.nickname ||
                  userProfile?.name ||
                  userProfile?.email}
              </span>
              <Link
                href="/my"
                className="mt-1 flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-gold-start"
                onClick={onClose}
              >
                <UserCircle className="h-3.5 w-3.5" />
                마이페이지
              </Link>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col py-2">
          {/* 관리자 메뉴 섹션 - 관리자만 표시 */}
          {isAdmin && (
            <>
              <div className="mb-2 px-4 py-1 text-xs font-semibold text-blue-500">
                관리자
              </div>
              {adminMenuItems.map((item, index) => (
                <Link
                  key={`admin-${index}`}
                  href={item.href}
                  className="flex items-center px-4 py-3 text-blue-600 hover:bg-blue-50"
                  onClick={onClose}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
              <div className="my-2 border-b border-gray-200"></div>
            </>
          )}

          {/* 학습 관련 메뉴 섹션 */}
          <div className="mb-2 px-4 py-1 text-xs font-semibold text-gray-500">
            학습
          </div>
          {menuItems.slice(0, 6).map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}

          {/* 스터디 관련 메뉴 섹션 */}
          <div className="mb-2 mt-2 px-4 py-1 text-xs font-semibold text-gray-500">
            스터디
          </div>
          {menuItems.slice(6, 8).map((item, index) => (
            <Link
              key={`study-${index}`}
              href={item.href}
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}

          {/* 기타 메뉴 섹션 */}
          <div className="mb-2 mt-2 px-4 py-1 text-xs font-semibold text-gray-500">
            기타
          </div>
          {menuItems.slice(8).map((item, index) => (
            <Link
              key={`other-${index}`}
              href={item.href}
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="mt-auto p-6">
          <Button
            onClick={async () => {
              await onLogout();
              onClose();
            }}
            className="w-full justify-center"
          >
            로그아웃
          </Button>
        </div>
      </div>
    </>
  );
};

export default RightSideBar;
