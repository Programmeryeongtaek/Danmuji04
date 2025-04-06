'use client';

import {
  useAllCourseProgress,
  useCourseList,
  useCoursePermission,
} from '@/hooks/useCourse';
import { getCategoryTitle } from '@/types/course/categories';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, Check, Edit, Play, Youtube } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import CourseActions from './CourseActions';

interface CourseListProps {
  category?: string;
}

export default function CourseList({ category }: CourseListProps) {
  const { courses: initialCourses, isLoading: coursesLoading } =
    useCourseList(category);
  const { progressData, isLoading: progressLoading } = useAllCourseProgress();
  const { isAdmin } = useCoursePermission();
  const [courses, setCourses] = useState(initialCourses);

  // initialCourses가 변경될 때 로컬 상태 업데이트
  useEffect(() => {
    if (!coursesLoading) {
      const sortedCourses = [...initialCourses].sort(
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        // 각 코스의 첫 번째 아이템 정보를 가져옵니다
        const firstItem = course.sections?.[0]?.items?.[0];
        const progress = progressData[course.id] || {
          completed: false,
          writingCompleted: false,
        };

        // 이제 기본 페이지로 이동 - 첫 번째 강의 아이템은 서버에서 자동으로 가져옴
        const targetUrl = `/course/${course.category}/${course.id}`;

        return (
          <div
            key={course.id}
            className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* 관리자 기능 - 관리자에게만 표시 */}
            {isAdmin && (
              <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-md bg-white/80 p-1 shadow-sm backdrop-blur-sm">
                <CourseActions
                  courseId={course.id}
                  category={course.category}
                  onSuccess={handleDeleteSuccess}
                />
              </div>
            )}

            <Link href={targetUrl} className="flex flex-1 flex-col">
              {/* 유튜브 썸네일 (있는 경우) */}
              {firstItem?.youtube_id && (
                <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                  <img
                    src={`https://img.youtube.com/vi/${firstItem.youtube_id}/mqdefault.jpg`}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute bottom-2 right-2 rounded bg-black bg-opacity-70 px-2 py-1">
                    <Youtube className="h-4 w-4 text-red-500" />
                  </div>
                </div>
              )}

              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-2 line-clamp-2 text-lg font-medium">
                  {course.title}
                </h3>

                {course.description && (
                  <p className="mb-4 line-clamp-3 text-sm text-gray-600">
                    {course.description}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between text-sm text-gray-500">
                  {/* 학습 상태 표시 (강의 등록자 대신) */}
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
                      <span>{progress.completed ? '학습 완료' : '미수강'}</span>
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
              </div>

              {/* 학습하기 버튼 추가 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex justify-center">
                  <span className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white">
                    강의 바로보기
                  </span>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
