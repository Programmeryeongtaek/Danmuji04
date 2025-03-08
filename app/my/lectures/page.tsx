'use client';

import Card from '@/components/common/Card';
import { useToast } from '@/components/common/Toast/Context';
import { ToastType } from '@/components/common/Toast/type';
import { Lecture } from '@/types/knowledge/lecture';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MyLecturePage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const loadMyLectures = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          showToast('로그인이 필요합니다.', 'warning' as ToastType);
          return;
        }

        // profiles 테이블에서 사용자의 instructor 이름을 가져옵니다
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, nickname')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        const instructorName = profile.nickname || profile.name;

        // 해당 instructor의 강의들을 가져옵니다
        const { data: lecturesData, error } = await supabase
          .from('lectures')
          .select('*')
          .eq('instructor', instructorName)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setLectures(lecturesData || []);
      } catch (error) {
        console.error('Error loading lectures:', error);
        showToast('강의 목록을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadMyLectures();
  }, [showToast]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-8 text-2xl font-bold">내 강의</h1>

      {lectures.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {lectures.map((lecture) => (
            <Card
              key={lecture.id}
              {...lecture}
              showBookmark={false}
              isMyLecture={true}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center">
          <p className="mb-4 text-gray-500">등록한 강의가 없습니다.</p>
          <Link
            href="/my/lectureCreate"
            className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white hover:opacity-90"
          >
            강의 등록하기
          </Link>
        </div>
      )}
    </div>
  );
}
