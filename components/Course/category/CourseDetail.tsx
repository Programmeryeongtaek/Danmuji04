'use client';

import { Course, CourseItem } from '@/types/course/courseModel';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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

  // category 사용 예시
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

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-4">
        <Link
          href={`/course/${category}`}
          className="flex items-center text-blue-500 hover:underline"
        >
          <span>← {category} 카테고리로 돌아가기</span>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">{course.title}</h1>

        <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
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
        </div>

        <p className="text-gray-700">{course.description}</p>
      </div>

      <div className="border-t pt-6">
        <h2 className="mb-4 text-xl font-semibold">강의 목록</h2>

        <div className="space-y-4">
          {courseItems.length === 0 ? (
            <p className="text-gray-500">등록된 강의가 없습니다.</p>
          ) : (
            courseItems.map((item, index) => (
              <Link
                key={item.id}
                href={`/course/${category}/${courseId}/learn/${item.id}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium">
                    {index + 1}. {item.title}
                  </div>
                  {item.description && (
                    <div className="mt-1 text-sm text-gray-600">
                      {item.description}
                    </div>
                  )}
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
