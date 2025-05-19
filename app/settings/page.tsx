'use client';

import { User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsMenu = [
  {
    title: '프로필',
    description: '프로필 정보 및 관심 분야 설정',
    href: '/settings/profile',
    icon: User,
  },
  // {
  //   title: '계정',
  //   description: ' 비밀번호 변경 및 계정 관리',
  //   href: '/settings/account',
  //   icon: Shield,
  // },
  // {
  //   title: '알림',
  //   description: '알림, 구독 및 마케팅 정보 수신 설정',
  //   href: 'settings/alerts',
  //   icon: Bell,
  // },
];

const SettingsPage = () => {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-8 text-2xl font-bold">설정</h1>

      <div className="grid gap-4">
        {settingsMenu.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-start gap-4 rounded-lg border p-4 transition-colors hover:border-gold-start hover:bg-light ${
              pathname === href
                ? 'border-gold-start bg-gold-end/5'
                : 'border-gray-200'
            }`}
          >
            <Icon className="mt-1 h-5 w-5" />
            <div>
              <h2 className="font-medium">{title}</h2>
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
