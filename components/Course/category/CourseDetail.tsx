'use client';

import { useCoursePermission } from '@/hooks/useCourse';
import { Course, CourseItem } from '@/app/types/course/courseModel';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, ChevronRight, Play, User, Youtube } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import CourseActions from './CourseActions';

interface CourseDetailProps {
  courseId: string;
  category: string;
}

export default function CourseDetail({
  courseId,
  category,
}: CourseDetailProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [courseItems, setCourseItems] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useCoursePermission();

  useEffect(() => {
    async function fetchCourseData() {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // 코스 정보 가져오기
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;

        // 코스 아이템(강의) 가져오기
        const { data: itemsData, error: itemsError } = await supabase
          .from('course_items')
          .select('*')
          .eq('course_id', courseId)
          .order('order_num', { ascending: true });

        if (itemsError) throw itemsError;

        setCourse(courseData);
        setCourseItems(itemsData || []);
      } catch (error) {
        console.error('코스 데이터 불러오기 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourseData();
  }, [courseId]);

  useEffect(() => {
    document.title = `${category} 코스 - ${course?.title || '상세 정보'}`;
  }, [category, course]);

  if (isLoading) {
    return <div className="py-8 text-center">코스 정보를 불러오는 중...</div>;
  }

  if (!course) {
    return (
      <div className="py-8 text-center">
        <div>코스를 찾을 수 없습니다.</div>
        <Link
          href={`/course/${category}`}
          className="mt-4 inline-block text-blue-500 hover:underline"
        >
          {category} 카테고리로 돌아가기
        </Link>
      </div>
    );
  }

  // 첫 번째 강의 아이템 가져오기 (학습 시작 버튼용)
  const firstItem = courseItems.length > 0 ? courseItems[0] : null;

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-4">
        <Link
          href={`/course/${category}`}
          className="flex items-center text-blue-500 hover:underline"
        >
          <span>← {getCategoryTitle(category)} 카테고리로 돌아가기</span>
        </Link>
      </div>

      <div className="mb-6 overflow-hidden rounded-lg border shadow-md">
        {/* 썸네일 영역 */}
        {firstItem?.youtube_id && (
          <div className="relative aspect-video w-full bg-gray-100">
            <img
              src={`https://img.youtube.com/vi/${firstItem.youtube_id}/maxresdefault.jpg`}
              alt={course.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                // 고해상도 썸네일이 없으면 중간 해상도로 대체
                const target = e.target as HTMLImageElement;
                target.src = `https://img.youtube.com/vi/${firstItem.youtube_id}/mqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
              {firstItem && (
                <Link
                  href={`/course/${category}/${courseId}/learn/${firstItem.id}`}
                  className="flex items-center gap-2 rounded-full bg-white bg-opacity-90 px-6 py-3 text-lg font-medium text-gray-900 shadow-lg transition-transform hover:scale-105"
                >
                  <Play className="h-6 w-6 text-blue-600" />
                  <span>학습 시작하기</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* 강의 정보 */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h1 className="mb-2 text-2xl font-bold">{course.title}</h1>

            {/* 관리자 기능 추가 */}
            {isAdmin && (
              <CourseActions
                courseId={course.id}
                category={course.category}
                onSuccess={() => {
                  // 강의가 삭제되면 목록으로 이동
                  window.location.href = `/course/${category}`;
                }}
              />
            )}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User size={16} />
              <span>{course.instructor_name}</span>
            </div>

            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>
                {formatDistanceToNow(new Date(course.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>

            <div className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">
              {getCategoryTitle(category)}
            </div>
          </div>

          <p className="text-gray-700">{course.description}</p>

          {/* 큰 학습 버튼 (모바일 친화적) */}
          {firstItem && (
            <div className="mt-6">
              <Link
                href={`/course/${category}/${courseId}/learn/${firstItem.id}`}
                className="block w-full rounded-lg bg-blue-500 py-3 text-center font-medium text-white hover:bg-blue-600 md:hidden"
              >
                바로 학습 시작하기
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Youtube className="h-5 w-5 text-red-500" />
          강의 컨텐츠
        </h2>

        <div className="space-y-4">
          {courseItems.length === 0 ? (
            <p className="text-gray-500">등록된 강의가 없습니다.</p>
          ) : (
            courseItems.map((item, index) => (
              <Link
                key={item.id}
                href={`/course/${category}/${courseId}/learn/${item.id}`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    {item.description && (
                      <div className="mt-1 text-sm text-gray-600">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 md:inline-block">
                    학습하기
                  </span>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 카테고리 이름 가져오기 함수
function getCategoryTitle(category: string): string {
  const categoryMap: Record<string, string> = {
    reading: '독서',
    writing: '글쓰기',
    question: '질문',
    // 필요에 따라 더 추가
  };

  return categoryMap[category] || category;
}
