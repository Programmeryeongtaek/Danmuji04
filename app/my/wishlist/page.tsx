'use client';

import Card from '@/components/common/Card';
import { Lecture } from '@/types/knowledge/lecture';
import { fetchWishlist } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export default function WishlistPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const data = await fetchWishlist();
        setLectures(data.map((item) => item.lecture));
      } catch (error) {
        console.error('Error loading wishlist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWishlist();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-8 text-2xl font-bold">찜한 강의</h1>
      {lectures.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {lectures.map((lecture) => (
            <Card key={lecture.id} {...lecture} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500">찜한 강의가 없습니다.</div>
      )}
    </div>
  );
}
