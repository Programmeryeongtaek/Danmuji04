'use client';

import { useCourseList, useCoursePermission } from '@/hooks/useCourse';
import QuoteSection from '../QuotesSection';
import { CourseCategory, isValidCategory } from '@/app/types/course/categories';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import CourseList from './CourseList';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import CourseProgressSummary from '../CourseProgressSummary';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';
import { courseProgressAtom } from '@/store/course/progressAtom';

interface CategoryDynamicContentProps {
  category: string;
  title: string;
}

export function CategoryDynamicContent({
  category,
  title,
}: CategoryDynamicContentProps) {
  const { isAdmin, isLoading: permissionLoading } = useCoursePermission();
  const { courses, isLoading: coursesLoading } = useCourseList(category);
  const progressState = useAtomValue(courseProgressAtom);
  const { progressData, isLoading: progressLoading } = progressState;
  const [userName, setUserName] = useState('');
  const user = useAtomValue(userAtom);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, nickname')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserName(
            profile.nickname || profile.name || user.email || '사용자'
          );
        }
      }
    };

    fetchUserProfile();
  }, []);

  // 진행 상황 계산
  const calculateProgress = () => {
    if (progressLoading || coursesLoading) {
      return { totalCourses: 0, completedCourses: 0, completedWritings: 0 };
    }

    // 현재 카테고리에 속한 코스만 필터링
    const categoryCourses = courses.filter(
      (course) => course.category === category
    );
    const totalCourses = categoryCourses.length;

    let completedCourses = 0;
    let completedWritings = 0;

    // 각 코스의 완료 상태 확인
    categoryCourses.forEach((course) => {
      const progress = progressData[course.id];
      if (progress) {
        if (progress.completed) completedCourses++;
        if (progress.writingCompleted) completedWritings++;
      }
    });

    return { totalCourses, completedCourses, completedWritings };
  };

  const { totalCourses, completedCourses, completedWritings } =
    calculateProgress();

  // 유효한 카테고리인지 확인하고 CourseCategory 타입으로 변환
  const validCategory = isValidCategory(category)
    ? (category as CourseCategory)
    : 'reading';

  return (
    <div className="mx-auto max-w-7xl py-12 mobile:px-4 tablet:px-6">
      {/* 명언 섹션 유지 - 유효한 카테고리만 전달 */}
      <QuoteSection
        category={isValidCategory(category) ? category : undefined}
      />

      <div className="my-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{title} 코스</h1>

          {!permissionLoading && isAdmin && (
            <Link
              href={`/course/create?category=${category}`}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition-opacity hover:opacity-90"
            >
              <PlusCircle className="h-5 w-5" />
              코스 개설
            </Link>
          )}
        </div>

        <p className="mb-8 text-gray-600">
          정리하며 {title}에 관한 지식을 정립해보세요. <br />
          영상 시청과 글쓰기를 모두 완료하면 수료증이 발급됩니다. <br />
          선별한 {title} 관련 영상을 보고 자신만의 생각을 글로 정리해보세요.
        </p>

        {/* 진행 상황 요약 컴포넌트 - 카테고리 prop 추가 */}
        {user && totalCourses > 0 && (
          <CourseProgressSummary
            categoryName={title}
            totalCourses={totalCourses}
            completedCourses={completedCourses}
            completedWritings={completedWritings}
            userName={userName}
            category={validCategory}
          />
        )}

        {/* 카테고리에 해당하는 코스 목록 */}
        <CourseList category={category} />
      </div>
    </div>
  );
}
