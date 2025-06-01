'use client';

import {
  useAllCourseProgress,
  useCourseList,
  useCoursePermission,
} from '@/hooks/useCourse';
import { getCategoryTitle } from '@/app/types/course/categories';
import { Check, Edit } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import CourseActions from './CourseActions';
import { CourseWithSections } from '@/app/types/course/courseModel';

interface CourseListProps {
  category?: string;
}

export default function CourseList({ category }: CourseListProps) {
  const { courses: initialCourses, isLoading: coursesLoading } =
    useCourseList(category);
  const { progressData, isLoading: progressLoading } = useAllCourseProgress();
  const { isAdmin } = useCoursePermission();
  const [courses, setCourses] = useState<CourseWithSections[]>(
    initialCourses as CourseWithSections[]
  );

  // initialCourses가 변경될 때 로컬 상태 업데이트
  useEffect(() => {
    if (!coursesLoading) {
      const sortedCourses = [...(initialCourses as CourseWithSections[])].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setCourses(sortedCourses);
    }
  }, [initialCourses, coursesLoading]);

  // 삭제 성공 후 UI 업데이트를 위한 콜백
  const handleDeleteSuccess = (deletedCourseId: string) => {
    // 삭제된 코스를 목록에서 제거
    setCourses((prevCourses) =>
      prevCourses.filter((course) => course.id !== deletedCourseId)
    );
  };

  const isLoading = coursesLoading || progressLoading;

  if (isLoading) {
    return <div className="py-8 text-center">강의를 불러오는 중...</div>;
  }

  if (courses.length === 0) {
    return (
      <div className="py-8 text-center">
        {category
          ? `${getCategoryTitle(category)} 관련 강의가 없습니다.`
          : '등록된 강의가 없습니다.'}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 laptop:grid-cols-3">
      {courses.map((course: CourseWithSections) => {
        const progress = progressData[course.id] || {
          completed: false,
          writingCompleted: false,
        };

        // 이제 기본 페이지로 이동 - 첫 번째 강의 아이템은 서버에서 자동으로 가져옴
        const targetUrl = `/course/${course.category}/${course.id}`;

        return (
          <div
            key={course.id}
            className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:border-gold-start hover:bg-light hover:shadow-md"
          >
            {/* 관리자 기능 - 관리자에게만 표시 */}
            {isAdmin && (
              <div className="absolute right-2 top-2 flex gap-1">
                <CourseActions
                  courseId={course.id}
                  category={course.category}
                  onSuccess={handleDeleteSuccess}
                />
              </div>
            )}
            <Link href={targetUrl} className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex justify-between">
                  <div className="mt-auto flex items-center justify-between text-sm text-gray-500">
                    {/* 학습 상태 표시 */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                          progress.completed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Check
                          className={`h-3 w-3 ${progress.completed ? 'text-green-600' : 'text-gray-400'}`}
                        />
                        <span>
                          {progress.completed ? '학습 완료' : '미수강'}
                        </span>
                      </div>

                      <div
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                          progress.writingCompleted
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Edit
                          className={`h-3 w-3 ${progress.writingCompleted ? 'text-blue-600' : 'text-gray-400'}`}
                        />
                        <span>
                          {progress.writingCompleted
                            ? '글작성 완료'
                            : '글작성 미완료'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex h-[60px] border-b">
                  <h3 className="line-clamp-2 flex text-lg font-medium group-hover:font-semibold">
                    {course.title}
                  </h3>
                </div>

                {course.description && (
                  <p className="line-clamp-3 text-sm text-gray-600 group-hover:text-black">
                    {course.description}
                  </p>
                )}
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
