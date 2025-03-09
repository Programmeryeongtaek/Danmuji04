'use client';

import { useCoursePermission } from '@/hooks/useCourse';
import QuoteSection from '../QuotesSection';
import { isValidCategory } from '@/types/course/categories';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import CourseList from './CourseList';

interface CategoryDynamicContentProps {
  category: string;
  title: string;
}

export function CategoryDynamicContent({
  category,
  title,
}: CategoryDynamicContentProps) {
  const { isAdmin, isLoading: permissionLoading } = useCoursePermission();

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      {/* 명언 섹션 유지 - 유효한 카테고리만 전달 */}
      <QuoteSection
        category={isValidCategory(category) ? category : undefined}
      />

      <div className="my-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{title} 강의 목록</h1>

          {!permissionLoading && isAdmin && (
            <Link
              href={`/course/create?category=${category}`}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition-opacity hover:opacity-90"
            >
              <PlusCircle className="h-5 w-5" />
              강의 추가하기
            </Link>
          )}
        </div>

        <p className="mb-8 text-gray-600">
          다양한 {title} 관련 강의를 둘러보고 학습하세요.
        </p>

        {/* 카테고리에 해당하는 코스 목록 */}
        <CourseList category={category} />
      </div>
    </div>
  );
}
