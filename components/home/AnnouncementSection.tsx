'use client';

import { fetchPosts } from '@/utils/services/community/postService';
import { Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AnnouncementProps {
  id: number;
  title: string;
  created_at: string;
  category: string;
}

const AnnouncementSection = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncements = async () => {
      setIsLoading(true);
      try {
        const posts = await fetchPosts({ category: 'notice' });

        // 최신순으로 정렬 최대 5개만 표시
        const latestAnnouncements = posts
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 5);

        setAnnouncements(latestAnnouncements);
      } catch (error) {
        console.error('공지사항 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // 새로운 공지인지 확인 (30일 이내 등록된 공지)
  const isNewAnnouncement = (dateString: string) => {
    const postDate = new Date(dateString);
    const now = new Date();
    const differenceInDays = Math.ceil(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return differenceInDays <= 30;
  };

  return (
    <section className="rounded-xl border bg-light p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gold-start" />
          <h2 className="text-xl font-bold">공지사항</h2>
        </div>
        <Link
          href="/community?category=notice"
          className="flex items-center text-sm text-gray-500 hover:font-semibold hover:text-gold-start"
        >
          더보기 <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-end/40 border-t-transparent"></div>
        </div>
      ) : announcements.length > 0 ? (
        <ul className="divide-y">
          {announcements.map((item) => (
            <li key={item.id} className="py-3">
              <Link
                href={`/community/post/${item.id}`}
                className="group flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {isNewAnnouncement(item.created_at) && (
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                  <span className="group-hover:font-semibold group-hover:text-black">
                    {item.title}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(item.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border bg-gray-50 p-4">
          <Bell className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">등록된 공지사항이 없습니다.</p>
        </div>
      )}
    </section>
  );
};

export default AnnouncementSection;
