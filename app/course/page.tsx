'use client';

import QuoteSection from '@/components/Course/QuotesSection';
import {
  COURSE_CATEGORIES,
  CourseCategory,
} from '@/app/types/course/categories';
import { BookOpen, Edit, HelpCircle, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSupabase from '@/hooks/useSupabase';
import { createClient } from '@/utils/supabase/client';

// 주요 카테고리 목록
const featuredCategories = [
  { id: 'reading' as CourseCategory, icon: BookOpen },
  { id: 'writing' as CourseCategory, icon: Edit },
  { id: 'question' as CourseCategory, icon: HelpCircle },
];

export default function CoursePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useSupabase();

  // useCoursePermission 훅을 사용하지 않고 직접 구현
  useEffect(() => {
    const checkAdminDirectly = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('CoursePage 프로필 조회 실패:', error);
          setIsAdmin(false);
        } else {
          const adminResult = profile?.role === 'admin';

          // 🔥 강제 리렌더링을 위해 상태를 두 번 업데이트
          setIsAdmin(false); // 먼저 false로 설정
          setTimeout(() => {
            setIsAdmin(adminResult); // 그 다음 실제 값으로 설정
          }, 10);
        }
      } catch (error) {
        console.error('CoursePage 권한 확인 중 예외:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      checkAdminDirectly();
    } else if (user === null) {
      setIsAdmin(false);
      setIsLoading(false);
    }
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl py-12 mobile:px-4 tablet:px-6">
      {/* 명언 섹션 유지 */}
      <QuoteSection />

      <div className="my-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">코스</h1>

          {!isLoading && isAdmin && (
            <Link
              href="/course/create"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition-opacity hover:opacity-90"
            >
              <PlusCircle className="h-5 w-5" />
              코스 개설
            </Link>
          )}
        </div>

        <p className="mb-8 text-gray-600">
          주제별 코스들을 공부하고 수료해보세요. <br />
          선별한 영상들로 지식을 쌓아보세요.
        </p>

        {/* 카테고리 섹션 */}
        <div className="grid gap-6 mobile:grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {featuredCategories.map(({ id, icon: Icon }) => {
            const category = COURSE_CATEGORIES[id];

            return (
              <Link
                key={id}
                href={`/course/${id}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 transition-all hover:border-gold-start hover:shadow-lg"
              >
                <div className="flex h-32 items-center justify-center bg-gray-50 p-6 transition-colors group-hover:bg-gold-start/5">
                  <Icon className="h-16 w-16 text-gold-start transition-colors group-hover:text-gold-start" />
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">
                    {category.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {category.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
