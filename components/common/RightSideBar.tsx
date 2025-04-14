'use client';

import {
  Bell,
  Bookmark,
  BookOpen,
  GraduationCap,
  Heart,
  Settings,
  User,
  Video,
  X,
} from 'lucide-react';
import Button from './Button/Button';
import Image from 'next/image';
import Link from 'next/link';

interface RightSideBarProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: {
    avatar_url?: string | null;
    nickname?: string | null;
    name: string | null;
    email: string | null;
  } | null;
  onLogout: () => void;
}

const menuItems = [
  // TODO: 이어서 학습하기 링크 연결 (캐시해서 자동으로 연결 - 마지막에 시청한 영상 링크로 이동하도록)
  { icon: BookOpen, label: '내 학습', href: '/my/learning' },
  { icon: Video, label: '이어서 학습하기', href: '/' },
  { icon: Heart, label: '찜 리스트', href: '/my/wishlist' },
  { icon: Bookmark, label: '북마크', href: '/my/bookmarks' },
  { icon: BookOpen, label: '내 글 모음', href: '/my/writings' },
  { icon: GraduationCap, label: '수료증', href: '/my/certificates' },
  { icon: Bell, label: '알림', href: '/my/notifications' },
  { icon: Settings, label: '설정', href: '/settings' },
];

const RightSideBar = ({
  isOpen,
  onClose,
  userProfile,
  onLogout,
}: RightSideBarProps) => {
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
        className={`fixed right-0 top-0 h-full w-60 transform bg-white transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Slider Header */}
        <div className="flex justify-between p-3">
          <X className="h-4 w-4" onClick={onClose} />
        </div>

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
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col py-2">
          {menuItems.map((item, index) => (
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
        </nav>

        {/* Logout Button */}
        <div className="p-6">
          <Button onClick={onLogout} className="w-full justify-center">
            로그아웃
          </Button>
        </div>
      </div>
    </>
  );
};

export default RightSideBar;
