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
import { markItemAsCompleted } from '@/utils/services/course/courseService';
import VideoPlayer from '@/components/knowledge/lecture/watch/VideoPlayer';
import WritingSection from './WritingSection';
import { useAtom, useAtomValue } from 'jotai';
import {
  courseProgressAtom,
  updateItemCompletionAtom,
} from '@/store/course/progressAtom';
import {
  useIsItemCompleted,
  useMarkItemCompleted,
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

  // 코스 진도는 Jotai로 계속 관리
  const progressState = useAtomValue(courseProgressAtom);
  const [, updateItemCompletion] = useAtom(updateItemCompletionAtom);

  // 강의 진도는 TanStack Query로 관리
  const lectureId = parseInt(courseId);
  const itemIdNumber = parseInt(itemId);

  const markItemCompletedMutation = useMarkItemCompleted();
  const updateLastWatchedMutation = useUpdateLastWatched();
  const isItemCompleted = useIsItemCompleted(lectureId, itemIdNumber);

  // 완료된 아이템 목록 Jotai에서 가져오기
  const completedItems =
    progressState.progressData[courseId]?.completedItems || [];

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

  // 페이지 제목 설정 (category 사용 예)
  useEffect(() => {
    if (currentItem && course) {
      document.title = `${getCategoryTitle(category)} - ${course.title}`;
    }
  }, [category, course, currentItem]);

  // 강의 아이템 시청 위치 업데이트
  useEffect(() => {
    if (currentItem && lectureId && itemIdNumber) {
      updateLastWatchedMutation.mutate({
        lectureId,
        itemId: itemIdNumber,
      });
    }
  }, [currentItem, lectureId, itemIdNumber, updateLastWatchedMutation]);

  // 아이템 완료 처리 함수
  const handleItemComplete = async (): Promise<void> => {
    try {
      // 1. 코스 진도 확인 (Jotai)
      if (completedItems.includes(itemId)) {
        return;
      }

      // 2. 강의 진도 확인 (TanStack Query)
      if (isItemCompleted) {
        // 이미 강의에서는 완료됨, 코스 진도만 업데이트
        updateItemCompletion(courseId, itemId);
        showToast('학습이 완료되었습니다.', 'success');
        return;
      }

      // 3. 서버에 코스 아이템 완료 처리
      const success = await markItemAsCompleted(courseId, itemId);

      if (success) {
        // 4. 강의 진도 업데이트 (TanStack Query)
        await markItemCompletedMutation.mutateAsync({
          lectureId,
          itemId: itemIdNumber,
        });

        // 5. 코스 진도 업데이트 (Jotai)
        updateItemCompletion(courseId, itemId);

        showToast('학습이 완료되었습니다.', 'success');
      } else {
        showToast('완료 처리에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('아이템 완료 처리 중 오류:', error);
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  // 카테고리 제목 가져오기
  const getCategoryTitle = (category: string): string => {
    const categoryMap: Record<string, string> = {
      reading: '독서',
      writing: '글쓰기',
      question: '질문',
      // 필요에 따라 더 추가
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

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-xl font-bold">{currentItem.title}</h1>

      {/* 강의 영상 - 항상 표시 */}
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

      {currentItem.description && (
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h2 className="mb-2 text-lg font-semibold">강의 설명</h2>
          <p className="text-gray-700">{currentItem.description}</p>
        </div>
      )}

      {/* 내용 정리 섹션 - 항상 표시 */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">내용 정리</h2>

        {/* WritingSection 컴포넌트 */}
        <WritingSection
          courseId={courseId}
          itemId={itemId}
          userWriting={userWriting}
          onWritingSaved={(writing) => setUserWriting(writing)}
          onWritingDeleted={() => setUserWriting(null)}
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
