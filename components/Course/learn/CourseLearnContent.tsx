'use client';

import { Course, CourseItem, CourseWriting } from '@/types/course/courseModel';
import { createClient } from '@/utils/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import YouTubePlayer from './YouTubePlayer';
import WritingSection from './WritingSection';

interface CourseLearnContentProps {
  courseId: string;
  itemId: string;
  category: string;
}

export default function CourseLearnContent({
  courseId,
  itemId,
  category,
}: CourseLearnContentProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [currentItem, setCurrentItem] = useState<CourseItem | null>(null);
  const [allItems, setAllItems] = useState<CourseItem[]>([]);
  const [userWriting, setUserWriting] = useState<CourseWriting | null>(null);
  const [otherWritings, setOtherWritings] = useState<CourseWriting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'video' | 'writings'>('video');

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // 1. 코스 정보 가져오기
        const { data: courseData } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        // 2. 모든 코스 아이템 가져오기
        const { data: itemsData } = await supabase
          .from('course_items')
          .select('*')
          .eq('course_id', courseId)
          .order('order_num', { ascending: true });

        // 3. 현재 아이템 찾기
        const currentItemData =
          itemsData?.find((item) => item.id === itemId) || null;

        // 4. 현재 유저 정보 가져오기
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // 5. 현재 유저의 글 가져오기
        let userWritingData = null;
        let otherWritingsData: CourseWriting[] = [];

        if (user) {
          const { data: userWritings } = await supabase
            .from('course_writings')
            .select('*')
            .eq('course_id', courseId)
            .eq('item_id', itemId)
            .eq('user_id', user.id)
            .single();

          userWritingData = userWritings;

          // 6. 다른 사용자의 공개된 글 가져오기
          const { data: publicWritings } = await supabase
            .from('course_writings')
            .select('*')
            .eq('course_id', courseId)
            .eq('item_id', itemId)
            .eq('is_public', true)
            .neq('user_id', user.id);

          otherWritingsData = publicWritings || [];
        }

        setCourse(courseData);
        setAllItems(itemsData || []);
        setCurrentItem(currentItemData);
        setUserWriting(userWritingData);
        setOtherWritings(otherWritingsData);
      } catch (error) {
        console.error('데이터 불러오기 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [courseId, itemId]);

  // 이전/다음 아이템 ID 계산
  const currentIndex = allItems.findIndex((item) => item.id === itemId);
  const prevItemId = currentIndex > 0 ? allItems[currentIndex - 1].id : null;
  const nextItemId =
    currentIndex < allItems.length - 1 ? allItems[currentIndex + 1].id : null;

  // 페이지 제목 설정 (category 사용 예)
  useEffect(() => {
    if (currentItem && course) {
      document.title = `${category} - ${course.title} - ${currentItem.title}`;
    }
  }, [category, course, currentItem]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        로딩 중...
      </div>
    );
  }

  if (!course || !currentItem) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="mb-4">강의를 찾을 수 없습니다.</div>
        <Link
          href={`/course/${category}`}
          className="text-blue-500 hover:underline"
        >
          {category} 카테고리로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4">
        <Link
          href={`/course/${category}/${courseId}`}
          className="flex items-center text-blue-500 hover:underline"
        >
          <ChevronLeft size={16} />
          <span>코스로 돌아가기</span>
        </Link>
      </div>

      <h1 className="mb-4 text-2xl font-bold">{currentItem.title}</h1>

      {/* 탭 영역 */}
      <div className="mb-4 flex border-b">
        <button
          className={`px-4 py-2 ${viewMode === 'video' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setViewMode('video')}
        >
          강의 영상
        </button>
        <button
          className={`px-4 py-2 ${viewMode === 'writings' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setViewMode('writings')}
        >
          모든 글 보기
        </button>
      </div>

      {/* 강의 영상 */}
      {viewMode === 'video' && (
        <>
          <div className="mb-6">
            <YouTubePlayer youtubeId={currentItem.youtube_id} />
          </div>

          {currentItem.description && (
            <div className="mb-6">
              <h2 className="mb-2 text-lg font-semibold">강의 설명</h2>
              <p className="text-gray-700">{currentItem.description}</p>
            </div>
          )}

          <WritingSection
            courseId={courseId}
            itemId={itemId}
            userWriting={userWriting}
            onWritingSaved={(writing) => setUserWriting(writing)}
          />
        </>
      )}

      {/* 모든 글 보기 */}
      {viewMode === 'writings' && (
        <div className="space-y-6">
          {userWriting && (
            <div className="rounded-lg border bg-blue-50 p-4">
              <h2 className="mb-2 text-lg font-semibold">내 글</h2>
              <p className="whitespace-pre-wrap">{userWriting.content}</p>
            </div>
          )}

          <h2 className="text-lg font-semibold">다른 사람의 글</h2>

          {otherWritings.length === 0 ? (
            <p className="text-gray-500">공유된 글이 없습니다.</p>
          ) : (
            otherWritings.map((writing) => (
              <div key={writing.id} className="rounded-lg border p-4">
                <div className="mb-2 flex justify-between">
                  <span className="font-medium">{writing.user_name}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(writing.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{writing.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* 이전/다음 버튼 */}
      <div className="mt-8 flex justify-between">
        {prevItemId ? (
          <Link
            href={`/course/${category}/${courseId}/learn/${prevItemId}`}
            className="flex items-center text-blue-500 hover:underline"
          >
            <ChevronLeft size={16} />
            <span>이전 강의</span>
          </Link>
        ) : (
          <div></div>
        )}

        {nextItemId ? (
          <Link
            href={`/course/${category}/${courseId}/learn/${nextItemId}`}
            className="flex items-center text-blue-500 hover:underline"
          >
            <span>다음 강의</span>
            <ChevronRight size={16} />
          </Link>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
}
