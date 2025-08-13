'use client';

import Card from '@/components/common/Card';
import { useToast } from '@/components/common/Toast/Context';
import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { BookmarkedLecture, useBookmarksList } from '@/hooks/api/useBookmarks';

export default function WishlistPage() {
  const user = useAtomValue(userAtom);
  const router = useRouter();
  const { showToast } = useToast();

  const {
    data: bookmarks = [],
    isLoading,
    error,
  } = useBookmarksList('lecture');

  // 로그인 체크
  useEffect(() => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
    }
  }, [user, router, showToast]);

  // 강의 북마크만 필터링
  const lectureBookmarks = bookmarks as BookmarkedLecture[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
        <span className="ml-2 text-gray-600">로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="mb-8 text-2xl font-bold">찜한 강의</h1>
        <div className="flex h-64 flex-col items-center justify-center">
          <p className="mb-4 text-red-500">
            위시리스트를 불러오는데 실패했습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-gold-start px-4 py-2 text-white hover:bg-gold-end"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-8 text-2xl font-bold">찜한 강의</h1>
      {lectureBookmarks.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {lectureBookmarks.map((bookmark) => (
            <Card key={bookmark.lecture_id} {...bookmark.lectures} />
          ))}
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center">
          <p className="mb-4 text-gray-500">찜한 강의가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
