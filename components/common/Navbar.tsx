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

const Navbar = () => {
  const pathname = usePathname();

  const navItems = [
    { name: '대시보드', path: '/dashboard', icon: LayoutDashboard },
    { name: '지식', path: '/knowledge', icon: BookOpen },
    { name: '홈', path: '/', icon: Home },
    { name: '코스', path: '/course', icon: GraduationCap },
    { name: '더보기', path: '/more', icon: MoreHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 flex h-[60px] w-full items-center">
      <div className="flex w-full">
        {navItems.map((item) => (
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
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
