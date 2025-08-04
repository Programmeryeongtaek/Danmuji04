'use client';

import {
  Course,
  CourseItem,
  CourseWriting,
} from '@/app/types/course/courseModel';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/common/Toast/Context';
import VideoPlayer from '@/components/knowledge/lecture/watch/VideoPlayer';
import WritingSection from './WritingSection';
import {
  useMarkItemCompleted as useCourseMarkItemCompleted,
  useIsItemCompleted as useCourseIsItemCompleted,
} from '@/hooks/api/useCourseProgress';
import {
  useIsItemCompleted as useLectureIsItemCompleted,
  useMarkItemCompleted as useLectureMarkItemCompleted,
  useUpdateLastWatched,
} from '@/hooks/api/useLectureProgress';

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
  const [userWriting, setUserWriting] = useState<CourseWriting | null>(null);
  const [otherWritings, setOtherWritings] = useState<CourseWriting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const lectureId = parseInt(courseId);
  const itemIdNumber = parseInt(itemId);

  // 코스 진도 관리 (TanStack Query)
  const courseMarkItemCompletedMutation = useCourseMarkItemCompleted();
  const isCourseItemCompleted = useCourseIsItemCompleted(courseId, itemId);

  // 강의 진도 관리 (TanStack Query)
  const lectureMarkItemCompletedMutation = useLectureMarkItemCompleted();
  const updateLastWatchedMutation = useUpdateLastWatched();
  const isLectureItemCompleted = useLectureIsItemCompleted(
    lectureId,
    itemIdNumber
  );

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

  // 페이지 제목 설정
  useEffect(() => {
    if (currentItem && course) {
      document.title = `${getCategoryTitle(category)} - ${course.title}`;
    }
  }, [category, course, currentItem]);

  // 강의 아이템 시청 위치 업데이트
  useEffect(() => {
    if (
      currentItem &&
      lectureId &&
      itemIdNumber &&
      !isNaN(lectureId) &&
      !isNaN(itemIdNumber)
    ) {
      updateLastWatchedMutation.mutate({
        lectureId,
        itemId: itemIdNumber,
      });
    }
  }, [currentItem, lectureId, itemIdNumber, updateLastWatchedMutation]);

  // 아이템 완료 처리 함수 (통합)
  const handleItemComplete = async (): Promise<void> => {
    try {
      // 1. 이미 완료된 상태인지 확인
      if (isCourseItemCompleted && isLectureItemCompleted) {
        showToast('이미 완료된 학습입니다.', 'info');
        return;
      }

      // 2. 병렬로 코스와 강의 진도 업데이트
      const promises = [];

      // 코스 진도 업데이트
      if (!isCourseItemCompleted) {
        promises.push(
          courseMarkItemCompletedMutation.mutateAsync({
            courseId,
            itemId,
          })
        );
      }

      // 강의 진도 업데이트 (유효한 숫자인 경우에만)
      if (
        !isLectureItemCompleted &&
        !isNaN(lectureId) &&
        !isNaN(itemIdNumber)
      ) {
        promises.push(
          lectureMarkItemCompletedMutation.mutateAsync({
            lectureId,
            itemId: itemIdNumber,
          })
        );
      }

      // 모든 업데이트 완료 대기
      await Promise.all(promises);

      showToast('학습이 완료되었습니다.', 'success');
    } catch (error) {
      console.error('아이템 완료 처리 중 오류:', error);
      showToast('완료 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // 글 저장 후 콜백
  const handleWritingSaved = (writing: CourseWriting) => {
    setUserWriting(writing);
  };

  // 글 삭제 후 콜백
  const handleWritingDeleted = () => {
    setUserWriting(null);
  };

  // 카테고리 제목 가져오기
  const getCategoryTitle = (category: string): string => {
    const categoryMap: Record<string, string> = {
      reading: '독서',
      writing: '글쓰기',
      question: '질문',
    };
    return categoryMap[category] || '코스';
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-lg">강의를 불러오는 중...</div>
      </div>
    );
  }

  if (!course || !currentItem) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="mb-4">강의를 찾을 수 없습니다.</div>
        <Link
          href={`/course/${category}`}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          {getCategoryTitle(category)} 카테고리로 돌아가기
        </Link>
      </div>
    );
  }

  // 완료 상태 계산
  const isCompleted =
    isCourseItemCompleted && (isNaN(lectureId) || isLectureItemCompleted);
  const isProcessing =
    courseMarkItemCompletedMutation.isPending ||
    lectureMarkItemCompletedMutation.isPending;

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-xl font-bold">{currentItem.title}</h1>

      {/* 강의 영상 */}
      <div className="mb-6 overflow-hidden rounded-lg">
        <VideoPlayer
          contentUrl={
            currentItem.youtube_id
              ? `https://www.youtube.com/watch?v=${currentItem.youtube_id}`
              : ''
          }
          type="video"
          youtubeId={currentItem.youtube_id}
          onComplete={handleItemComplete}
        />
      </div>

      {/* 강의 설명 */}
      {currentItem.description && (
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h2 className="mb-2 text-lg font-semibold">강의 설명</h2>
          <p className="text-gray-700">{currentItem.description}</p>
        </div>
      )}

      {/* 완료 버튼 */}
      <div className="mb-6 text-center">
        <button
          onClick={handleItemComplete}
          disabled={isProcessing || isCompleted}
          className={`rounded-lg px-6 py-2 font-medium transition-colors ${
            isCompleted
              ? 'bg-green-100 text-green-800'
              : isProcessing
                ? 'cursor-not-allowed bg-gray-300 text-gray-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isProcessing ? '처리 중...' : isCompleted ? '완료됨' : '학습 완료'}
        </button>
      </div>

      {/* 글쓰기 섹션 */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">내용 정리</h2>

        <WritingSection
          courseId={courseId}
          itemId={itemId}
          userWriting={userWriting}
          onWritingSaved={handleWritingSaved}
          onWritingDeleted={handleWritingDeleted}
        />

        {/* 다른 사람의 글 섹션 */}
        <div className="mt-8 border-t pt-4">
          <h2 className="mb-4 text-lg font-semibold">
            다른 사람의 글
            <span className="ml-2 rounded-full bg-gold-start/10 px-2 py-0.5 text-sm text-gold-start">
              {otherWritings.length}
            </span>
          </h2>

          {otherWritings.length === 0 ? (
            <p className="text-gray-500">공유된 글이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {otherWritings.map((writing) => (
                <div key={writing.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex justify-between">
                    <span className="font-medium">{writing.user_name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(writing.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{writing.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
