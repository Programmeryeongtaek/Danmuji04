'use client';

import { useToast } from '@/components/common/Toast/Context';
import { COURSE_CATEGORIES } from '@/app/types/course/categories';
import { CourseWriting } from '@/app/types/course/courseModel';
import { fetchAllUserWritings } from '@/utils/services/course/writingService';
import { Book, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface WritingWithDetails extends CourseWriting {
  course: {
    id: string;
    title: string;
    category: string;
  };
  item: {
    id: string;
    title: string;
  };
  expanded?: boolean; // 글 펼침 상태 추가
}

export default function MyWritingsPage() {
  const [writings, setWritings] = useState<WritingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const loadWritings = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAllUserWritings();
        // 각 항목에 expanded 속성 추가
        setWritings(
          (data as WritingWithDetails[]).map((item) => ({
            ...item,
            expanded: false,
          }))
        );
      } catch (error) {
        console.error('글 목록을 불러오는데 실패했습니다:', error);
        showToast('글 목록을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadWritings();
  }, [showToast]);

  // 날짜 그룹으로 묶기 (yyyy-mm-dd 형식)
  const groupedByDate = writings.reduce(
    (groups, writing) => {
      const date = new Date(writing.created_at).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(writing);
      return groups;
    },
    {} as Record<string, WritingWithDetails[]>
  );

  // 날짜 그룹 정렬 (최신순)
  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        글 목록을 불러오는 중...
      </div>
    );
  }

  if (writings.length === 0) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-6 text-2xl font-bold">내 글 모음</h1>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <Book className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h2 className="mb-2 text-lg font-medium text-gray-600">
            작성한 글이 없습니다
          </h2>
          <p className="text-gray-500">
            코스를 수강하면서 생각을 정리해보세요!
          </p>
          <Link
            href="/course"
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white"
          >
            코스 둘러보기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        내 글 모음{' '}
        <span className="text-base font-normal text-gray-500">
          ({writings.length}개)
        </span>
      </h1>

      {sortedDates.map((date) => (
        <div key={date} className="mb-8">
          <div className="mb-4 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium">
              {new Date(date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </h2>
          </div>

          <div className="space-y-4">
            {groupedByDate[date].map((writing) => (
              <div
                key={writing.id}
                className="rounded-lg border bg-white p-4 shadow-sm hover:border-gold-start hover:bg-light"
              >
                <Link
                  href={`/course/${writing.course?.category}/${writing.course?.id}/learn/${writing.item?.id}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                          {COURSE_CATEGORIES[
                            writing.course
                              ?.category as keyof typeof COURSE_CATEGORIES
                          ]?.title || writing.course?.category}
                        </span>
                        <h3 className="overflow-hidden text-ellipsis break-normal font-medium">
                          {writing.course?.title.length > 30
                            ? `${writing.course?.title.substring(0)}...`
                            : writing.course?.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    {writing.content.length > 200 ? (
                      <>
                        <p className="whitespace-pre-wrap">
                          {writing.expanded
                            ? writing.content
                            : `${writing.content.substring(0, 200)}...`}
                        </p>
                        <button
                          onClick={() => {
                            setWritings((prev) =>
                              prev.map((item) =>
                                item.id === writing.id
                                  ? { ...item, expanded: !item.expanded }
                                  : item
                              )
                            );
                          }}
                          className="mt-2 text-sm text-blue-500 hover:underline"
                        >
                          {writing.expanded ? '접기' : '더 보기'}
                        </button>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">{writing.content}</p>
                    )}
                  </div>

                  <div className="mt-3 flex justify-end"></div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
