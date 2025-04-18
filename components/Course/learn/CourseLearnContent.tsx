'use client';

import { Course, CourseItem, CourseWriting } from '@/types/course/courseModel';
import { createClient } from '@/utils/supabase/client';
import {
  ChevronLeft,
  ChevronRight,
  LayoutList,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import WritingSection from './WritingSection';
import { useToast } from '@/components/common/Toast/Context';
import { markCourseItemCompleted } from '@/utils/services/courseService';
import VideoPlayer from '@/components/knowledge/lecture/watch/VideoPlayer';

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
  const [activeTab, setActiveTab] = useState<'강의영상' | '모든글보기'>(
    '강의영상'
  );
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [isEditingMyWriting, setIsEditingMyWriting] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const { showToast } = useToast();

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

        // 5. 완료된 아이템 목록 가져오기
        if (user) {
          const { data: progressData } = await supabase
            .from('course_progress')
            .select('item_id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .eq('completed', true);

          if (progressData) {
            setCompletedItems(progressData.map((item) => item.item_id));
          }
        }

        // 6. 현재 유저의 글 가져오기
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

          // 7. 다른 사용자의 공개된 글 가져오기
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
      document.title = `${getCategoryTitle(category)} - ${course.title}`;
    }
  }, [category, course, currentItem]);

  // 진행도 계산 (몇 번째 강의 중 몇 번째인지)
  const progress = {
    current: currentIndex + 1,
    total: allItems.length,
    percentage:
      allItems.length > 0 ? ((currentIndex + 1) / allItems.length) * 100 : 0,
  };

  // 아이템 완료 처리 함수
  const handleItemComplete = async (): Promise<void> => {
    try {
      // 이미 완료된 아이템인지 확인
      if (completedItems.includes(itemId)) {
        return;
      }

      // 아이템 완료 처리
      const success = await markCourseItemCompleted(courseId, itemId);

      if (success) {
        showToast('학습이 완료되었습니다.', 'success');

        // 완료된 아이템 목록 업데이트
        setCompletedItems((prev) => {
          const updatedItems = new Set([...prev, itemId]);
          return Array.from(updatedItems);
        });
      } else {
        showToast('완료 처리에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('아이템 완료 처리 중 오류:', error);
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  // 내 글 수정하기
  const handleUpdateMyWriting = async () => {
    if (!userWriting || !editContent.trim()) return;

    try {
      setIsSaving(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('course_writings')
        .update({
          content: editContent,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userWriting.id)
        .select()
        .single();

      if (error) throw error;

      // 업데이트 성공
      setUserWriting(data);
      setIsEditingMyWriting(false);
    } catch (error) {
      console.error('글 수정 중 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 내 글 삭제하기
  const handleDeleteMyWriting = async () => {
    if (!userWriting || !confirm('정말로 글을 삭제하시겠습니까?')) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('course_writings')
        .delete()
        .eq('id', userWriting.id);

      if (error) throw error;

      // 삭제 성공
      setUserWriting(null);
      setEditContent('');
    } catch (error) {
      console.error('글 삭제 중 오류:', error);
    }
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
    <div className="relative mx-auto max-w-4xl p-4">
      {/* 헤더 영역 - 카테고리 제목과 이동 링크 */}
      <div className="mb-2 flex items-center justify-between">
        <Link
          href={`/course/${category}`}
          className="flex items-center text-blue-500 hover:underline"
        >
          <ChevronLeft size={16} />
          <span>{getCategoryTitle(category)} 강의 목록으로 돌아가기</span>
        </Link>

        {allItems.length > 1 && (
          <button
            onClick={() => setShowCurriculum(!showCurriculum)}
            className="flex items-center gap-1 rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
          >
            <LayoutList size={16} />
            <span>다른 강의 보기</span>
          </button>
        )}
      </div>

      {/* 진행 상태 표시 */}
      {allItems.length > 1 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              진행도: {progress.current}/{progress.total}
            </span>
            <span>{Math.round(progress.percentage)}% 완료</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 강의 제목 */}
      <h1 className="mb-2 text-xl font-bold">{currentItem.title}</h1>

      {/* 강의 목차 (팝오버) */}
      {showCurriculum && (
        <div className="absolute right-4 top-20 z-10 max-h-96 w-72 overflow-y-auto rounded-lg border bg-white p-4 shadow-lg">
          <div className="mb-2 flex items-center justify-between border-b pb-2">
            <h3 className="font-medium">강의 목차</h3>
            <button
              onClick={() => setShowCurriculum(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <ul className="space-y-1">
            {allItems.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={`/course/${category}/${courseId}/learn/${item.id}`}
                  className={`flex items-center rounded-md p-2 ${
                    item.id === currentItem.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs">
                    {index + 1}
                  </span>
                  <span className="line-clamp-1">{item.title}</span>
                  {completedItems.includes(item.id) && (
                    <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      완료
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 강의 영상 - 항상 표시 */}
      <div className="mb-6 overflow-hidden rounded-lg shadow-md">
        <VideoPlayer
          contentUrl={
            currentItem.youtube_id
              ? `https://www.youtube.com/watch?v=${currentItem.youtube_id}`
              : ''
          }
          type="video"
          youtubeId={currentItem.youtube_id}
          onComplete={handleItemComplete}
          isLastItem={nextItemId === null}
        />
      </div>

      {currentItem.description && (
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h2 className="mb-2 text-lg font-semibold">강의 설명</h2>
          <p className="text-gray-700">{currentItem.description}</p>
        </div>
      )}

      {/* 탭 영역 - 강의 영상/모든 글 보기 */}
      <div className="mb-4">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('강의영상')}
            className={`px-4 py-2 ${
              activeTab === '강의영상'
                ? 'border-b-2 border-blue-500 font-medium text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            강의 영상
          </button>
          <button
            onClick={() => setActiveTab('모든글보기')}
            className={`flex items-center px-4 py-2 ${
              activeTab === '모든글보기'
                ? 'border-b-2 border-blue-500 font-medium text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare size={16} className="mr-1" />
            <span>모든 글 보기</span>
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
              {otherWritings.length + (userWriting ? 1 : 0)}
            </span>
          </button>
        </div>
      </div>

      {activeTab === '강의영상' ? (
        // 나의 생각 정리하기 (강의 영상 탭)
        <WritingSection
          courseId={courseId}
          itemId={itemId}
          userWriting={userWriting}
          onWritingSaved={(writing) => setUserWriting(writing)}
        />
      ) : (
        // 모든 글 보기 (모든 글 보기 탭)
        <div className="space-y-6">
          {userWriting && (
            <div className="rounded-lg border bg-blue-50 p-4">
              {isEditingMyWriting ? (
                // 수정 모드
                <div className="space-y-4">
                  <h2 className="mb-2 text-lg font-semibold">내 글 수정</h2>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="h-48 w-full rounded-lg border p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="강의를 보고 느낀 점이나 배운 내용을 정리해보세요."
                  />

                  <div className="flex items-center">
                    <label className="flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="mr-2"
                      />
                      <span>다른 사람들에게 공개하기</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setIsEditingMyWriting(false);
                        setEditContent(userWriting.content);
                        setIsPublic(userWriting.is_public);
                      }}
                      className="rounded-lg border px-4 py-2"
                      disabled={isSaving}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleUpdateMyWriting}
                      className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                      disabled={isSaving || !editContent.trim()}
                    >
                      {isSaving ? '저장 중...' : '수정 완료'}
                    </button>
                  </div>
                </div>
              ) : (
                // 보기 모드
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">내 글</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDeleteMyWriting}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} /> 삭제
                      </button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{userWriting.content}</p>
                </div>
              )}
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
      {allItems.length > 1 && (
        <div className="mt-8 flex justify-between">
          {prevItemId ? (
            <Link
              href={`/course/${category}/${courseId}/learn/${prevItemId}`}
              className="flex items-center gap-1 rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
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
              className="flex items-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              <span>다음 강의</span>
              <ChevronRight size={16} />
            </Link>
          ) : (
            <Link
              href={`/course/${category}`}
              className="flex items-center gap-1 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            >
              <span>코스 완료!</span>
            </Link>
          )}
        </div>
      )}
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
