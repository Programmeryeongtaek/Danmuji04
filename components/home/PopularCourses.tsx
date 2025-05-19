'use client';

import {
  COURSE_CATEGORIES,
  CourseCategory,
} from '@/app/types/course/categories';
import { Course } from '@/app/types/course/courseTypes';

import { fetchCourses } from '@/utils/services/course/courseService';

import { Book, Edit, GraduationCap, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const PopularCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      setIsLoading(true);
      try {
        const coursesData = await fetchCourses();

        // 최근 등록된 코스 3개만 보여줌
        const recentCourses = coursesData.slice(0, 3);
        setCourses(recentCourses);
      } catch (error) {
        console.error('코스 목록 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCourses();
  }, []);

  // 카테고리 아이콘 가져오기
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'reading':
        return <Book className="h-5 w-5" />;
      case 'writing':
        return <Edit className="h-5 w-5" />;
      case 'question':
        return <HelpCircle className="h-5 w-5" />;
      default:
        return <Book className="h-5 w-5" />;
    }
  };

  // 카테고리 한글명 가져오기
  const getCategoryName = (category: string): string => {
    if (category in COURSE_CATEGORIES) {
      return COURSE_CATEGORIES[category as CourseCategory]?.title || category;
    }
    return category;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-gold-start" />
          <h2 className="text-2xl font-bold">테마 코스</h2>
        </div>
        <Link
          href="/course"
          className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
        >
          전체 테마
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
        </div>
      ) : courses.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/course/${course.category}/${course.id}`}
              className="flex flex-col rounded-xl border bg-white p-6 shadow-sm transition hover:border-gold-start hover:bg-light hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-start/10 text-gold-start">
                    {getCategoryIcon(course.category)}
                  </div>
                  <span className="font-medium text-gray-600">
                    {getCategoryName(course.category)}
                  </span>
                </div>
              </div>

              <h3 className="mb-2 text-lg font-semibold">{course.title}</h3>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border bg-gray-50 p-6">
          <p className="text-gray-500">아직 등록된 코스가 없습니다.</p>
        </div>
      )}
    </div>
  );
};

export default PopularCourses;
