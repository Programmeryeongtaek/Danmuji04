'use client';

import { useCourseList } from '@/hooks/useCourse';
import { getCategoryTitle } from '@/types/course/categories';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, User } from 'lucide-react';
import Link from 'next/link';

interface CourseListProps {
  category?: string;
}

export default function CourseList({ category }: CourseListProps) {
  const { courses, isLoading } = useCourseList(category);

  if (isLoading) {
    return <div className="py-8 text-center">코스를 불러오는 중...</div>;
  }

  if (courses.length === 0) {
    return (
      <div className="py-8 text-center">
        {category
          ? `${getCategoryTitle(category)} 관련 코스가 없습니다.`
          : '등록된 코스가 없습니다.'}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={`/course/${course.category}/${course.id}`}
          className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
        >
          <h3 className="mb-2 text-lg font-medium">{course.title}</h3>
          <p className="mb-4 line-clamp-3 text-sm text-gray-600">
            {course.description}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>{course.instructor_name}</span>
            </div>

            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>
                {formatDistanceToNow(new Date(course.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
