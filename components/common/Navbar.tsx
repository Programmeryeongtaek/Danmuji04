'use client';

import {
  BookOpen,
  GraduationCap,
  Home,
  LayoutDashboard,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import MoreMenu from './MoreMenu';

const Navbar = () => {
  const pathname = usePathname();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const navItems = [
    { name: '대시보드', path: '/dashboard', icon: LayoutDashboard },
    { name: '지식', path: '/knowledge', icon: BookOpen },
    { name: '홈', path: '/', icon: Home },
    { name: '코스', path: '/course', icon: GraduationCap },
    {
      name: '더보기',
      path: '#',
      icon: MoreHorizontal,
      onClick: () => setIsMoreMenuOpen(true),
    },
  ];

  return (
    <>
      <nav className="fixed bottom-0 flex h-[60px] w-full items-center bg-white">
        <div className="flex w-full">
          {navItems.map((item) =>
            item.onClick ? (
              <button
                key={item.path}
                className={`flex h-full w-full flex-1 flex-col items-center justify-center ${
                  isMoreMenuOpen && item.name === '더보기'
                    ? 'text-gold-start'
                    : 'text-light-subtext'
                }`}
                onClick={item.onClick}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </button>
            ) : (
              <Link key={item.path} href={item.path} className="h-full flex-1">
                <button
                  className={`flex h-full w-full items-center justify-center ${
                    pathname === item.path
                      ? 'border-gold-start text-gold-start'
                      : 'border-transparent text-light-subtext'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <item.icon size={20} />
                    <span>{item.name}</span>
                  </div>
                </button>
              </Link>
            )
          )}
        </div>
      </nav>

      {/* 더보기 메뉴 */}
      <MoreMenu
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
      />
    </>
  );
};

export default Navbar;
