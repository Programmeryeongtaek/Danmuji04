'use client';

import QuoteSection from '@/components/Course/QuotesSection';
import { useCoursePermission } from '@/hooks/useCourse';
import {
  COURSE_CATEGORIES,
  CourseCategory,
} from '@/app/types/course/categories';
import { BookOpen, Edit, HelpCircle, PlusCircle } from 'lucide-react';
import Link from 'next/link';

// 주요 카테고리 목록
const featuredCategories = [
  { id: 'reading' as CourseCategory, icon: BookOpen },
  { id: 'writing' as CourseCategory, icon: Edit },
  { id: 'question' as CourseCategory, icon: HelpCircle },
];

export default function CoursePage() {
  const { isAdmin, isLoading } = useCoursePermission();

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
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/course/create';
              }}
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
