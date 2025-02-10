import { BookmarkIcon } from 'lucide-react';
import Link from 'next/link';

const MyPageMenu = () => {
  return (
    <nav className="space-y-1">
      <Link
        href="/my/wishlist"
        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
      >
        <BookmarkIcon className="mr-3 h-5 w-5 text-gray-400" />
        찜한 강의
      </Link>
      {/* 다른 메뉴 항목들... */}
    </nav>
  );
};

export default MyPageMenu;
