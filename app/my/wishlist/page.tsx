'use client';

import Card from '@/components/common/Card';
import { useToast } from '@/components/common/Toast/Context';
import { ToastType } from '@/components/common/Toast/type';
import { Lecture } from '@/app/types/knowledge/lecture';
import { createClient, fetchWishlist } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export default function WishlistPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadWishlist = async () => {
    try {
      const data = await fetchWishlist();
      setLectures(data.map((item) => item.lecture));
    } catch (error) {
      console.error('Error loading wishlist:', error);
      showToast('위시리스트를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleToggleBookmark = async (lectureId: number) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast('로그인이 필요합니다.', 'warning' as ToastType);
      return;
    }

    try {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('lecture_id', lectureId)
        .eq('user_id', user.id);

      // 화면에서 즉시 제거
      setLectures((prev) => prev.filter((lecture) => lecture.id !== lectureId));
      showToast('찜하기가 취소되었습니다.', 'success');
    } catch (error) {
      showToast('오류가 발생했습니다.', error as ToastType);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-8 text-2xl font-bold">찜한 강의</h1>
      {lectures.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {lectures.map((lecture) => (
            <Card
              key={lecture.id}
              {...lecture}
              isBookmarked={true} // 찜한 상태로 표시
              onToggleBookmark={handleToggleBookmark}
            />
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
