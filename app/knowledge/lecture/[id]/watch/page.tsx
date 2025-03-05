'use client';

import CompletionModal from '@/components/Course/[slug]/[videoId]/CompletionModal';
import LectureCurriculum from '@/components/knowledge/lecture/watch/LectureCurriculum';
import NavigationButtons from '@/components/knowledge/lecture/watch/NavigationButtons';
import VideoPlayer from '@/components/knowledge/lecture/watch/VideoPlayer';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Lecture } from '@/types/knowledge/lecture';
import { LectureItem, LectureSection } from '@/types/lectureFrom';
import { createClient } from '@/utils/supabase/client';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// DB에서 불러온 섹션 데이터를 위한 타입
interface DBLectureSection {
  id: number;
  lecture_id: number;
  title: string;
  order_num: number;
  lecture_items: DBLectureItem[];
}

// DB에서 불러온 아이템 데이터를 위한 타입
interface DBLectureItem {
  id: number;
  section_id: number;
  title: string;
  type: 'video' | 'text';
  content_url: string;
  duration?: string;
  order_num: number;
}

export default function LectureWatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lectureId = params.id as string;
  // URL에서 시작 아이템 ID 확인
  const initialItemId = searchParams.get('item')
    ? Number(searchParams.get('item'))
    : null;

  const [isLoading, setIsLoading] = useState(true);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [sections, setSections] = useState<LectureSection[]>([]);
  const [currentItem, setCurrentItem] = useState<LectureItem | null>(null);
  const [showCurriculum, setShowCurriculum] = useState(true);
  const [prevItemId, setPrevItemId] = useState<number | null>(null);
  const [nextItemId, setNextItemId] = useState<number | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedCourses, setCompletedCourses] = useLocalStorage<string[]>(
    'completedCourses',
    []
  );

  // 완료된 항목 관리를 위한 useLocalStorage 사용
  const [completedItems, setCompletedItems] = useLocalStorage<
    Record<string, number[]>
  >('completedLectureItems', {});

  // 현재 코스가 완료되었는지 확인
  const isCourseCompleted = completedCourses.includes(lectureId);

  // 마지막 강의 완료 처리 함수
  const handleCourseCompletion = () => {
    setShowCompletionModal(true);

    // 아직 완료되지 않은 경우에만 완료 처리
    if (!isCourseCompleted) {
      // 완료된 코스 목록에 현재 코스 ID 추가
      setCompletedCourses([...completedCourses, lectureId]);
    }
  };

  // useLocalStorage 훅 사용
  const [lastWatchedItems, setLastWatchedItems] = useLocalStorage<
    Record<string, number>
  >('lastWatchedItems', {});

  // 업데이트 중인지 추적하는 ref
  const isUpdatingRef = useRef(false);

  // 모든 아이템들의 플랫한 리스트 생성
  const allItems = sections.flatMap((section) => section.lecture_items || []);

  // 강의 데이터 로드
  useEffect(() => {
    const fetchLectureData = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // 강의 정보 가져오기
        const { data: lectureData, error: lectureError } = await supabase
          .from('lectures')
          .select('id, title, category, instructor, depth, keyword, group_type')
          .eq('id', lectureId)
          .single();

        if (lectureError) throw lectureError;

        // 강의 섹션 정보 가져오기
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('lecture_sections')
          .select(`*, lecture_items(*)`)
          .eq('lecture_id', lectureId)
          .order('order_num', { ascending: true });

        if (sectionsError) throw sectionsError;

        // DB 데이터를 LectureSection[] 형식으로 변환
        const formattedSections: LectureSection[] = (
          sectionsData as DBLectureSection[]
        ).map((section: DBLectureSection) => ({
          id: section.id,
          lecture_id: section.lecture_id,
          title: section.title,
          order_num: section.order_num,
          lecture_items: section.lecture_items.sort(
            (a: DBLectureItem, b: DBLectureItem) => a.order_num - b.order_num
          ),
        }));

        setLecture(lectureData as Lecture);
        setSections(formattedSections);
      } catch (error) {
        console.error('Error fetching lecture data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLectureData();
  }, [lectureId]);

  // 초기 아이템 설정 (URL에서 아이템 ID가 있으면 그걸 사용, 없으면 이전에 본 아이템 또는 첫 아이템)
  useEffect(() => {
    if (allItems.length > 0) {
      // 아직 currentItem이 설정되지 않았거나,
      // URL의 initialItemId가 있는 경우 (페이지 전환 시 URL 쿼리로 들어온 경우)
      if (!currentItem || initialItemId) {
        if (initialItemId) {
          // URL에 지정된 아이템 ID가 있으면 그 아이템으로 설정
          const urlSpecifiedItem = allItems.find(
            (item) => item.id === initialItemId
          );
          if (urlSpecifiedItem) {
            setCurrentItem(urlSpecifiedItem);
            return;
          }
        }

        // URL에 지정된 아이템이 없거나 찾을 수 없는 경우,
        // 마지막으로 본 아이템을 찾음
        const lastWatchedItemId = lastWatchedItems[lectureId];
        const initialItem = lastWatchedItemId
          ? allItems.find((item) => item.id === lastWatchedItemId)
          : allItems[0];

        if (initialItem) {
          setCurrentItem(initialItem);
        } else if (allItems[0]) {
          setCurrentItem(allItems[0]);
        }
      }
    }
  }, [allItems, lectureId, currentItem, lastWatchedItems, initialItemId]);

  // 현재 아이템이 변경될 때 이전/다음 아이템 설정 및 로컬 스토리지 업데이트
  useEffect(() => {
    if (currentItem && allItems.length > 0) {
      const currentIndex = allItems.findIndex(
        (item) => item.id === currentItem.id
      );

      setPrevItemId(currentIndex > 0 ? allItems[currentIndex - 1].id : null);
      setNextItemId(
        currentIndex < allItems.length - 1
          ? allItems[currentIndex + 1].id
          : null
      );

      // useLocalStorage 업데이트 (무한 루프 방지를 위한 조건)
      if (!isUpdatingRef.current) {
        const itemId = currentItem.id;
        const key = lectureId;

        // 값이 변경된 경우에만 업데이트
        if (lastWatchedItems[key] !== itemId) {
          isUpdatingRef.current = true;

          const newItems = { ...lastWatchedItems };
          newItems[key] = itemId;
          setLastWatchedItems(newItems);

          // 다음 렌더링 사이클에서 플래그 초기화
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 0);
        }
      }
    }
  }, [currentItem, allItems, lectureId, lastWatchedItems, setLastWatchedItems]);

  // 나머지 핸들러 함수 및 렌더링 코드는 동일
  const handleItemSelect = (item: LectureItem) => {
    setCurrentItem(item);
  };

  const handlePrevious = () => {
    if (prevItemId !== null) {
      const prevItem = allItems.find((item) => item.id === prevItemId);
      if (prevItem) setCurrentItem(prevItem);
    }
  };

  const handleNext = () => {
    if (nextItemId !== null) {
      const nextItem = allItems.find((item) => item.id === nextItemId);
      if (nextItem) setCurrentItem(nextItem);
    }
  };

  const handleModalNextClick = () => {
    setShowCompletionModal(false);
    handleNext();
  };

  // 텍스트 콘텐츠 완료 처리 함수
  const handleTextComplete = () => {
    // 현재 아이템을 완료로 표시
    if (currentItem) {
      const lectureCompleted = completedItems[lectureId] || [];

      if (!lectureCompleted.includes(currentItem.id)) {
        const updatedCompleted = [...lectureCompleted, currentItem.id];
        const newCompletedItems = { ...completedItems };
        newCompletedItems[lectureId] = updatedCompleted;
        setCompletedItems(newCompletedItems);
      }
    }

    // 모달 표시
    setShowCompletionModal(true);
  };

  // 비디오 완료 시 현재 아이템을 완료로 표시하는 함수
  const handleVideoComplete = () => {
    if (currentItem) {
      const lectureCompleted = completedItems[lectureId] || [];

      if (!lectureCompleted.includes(currentItem.id)) {
        const updatedCompleted = [...lectureCompleted, currentItem.id];
        const newCompletedItems = { ...completedItems };
        newCompletedItems[lectureId] = updatedCompleted;
        setCompletedItems(newCompletedItems);
      }
    }

    // 다음 아이템으로 이동
    handleNext();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        로딩 중...
      </div>
    );
  }

  if (!lecture || !currentItem) {
    return (
      <div className="flex h-screen items-center justify-center">
        강의를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-16 pt-4">
      <h1 className="mb-4 text-xl font-bold">{lecture.title}</h1>

      {/* 비디오 플레이어 */}
      <div className="mb-6 overflow-hidden rounded-lg bg-black shadow-lg">
        <VideoPlayer
          contentUrl={currentItem.content_url || ''}
          type={currentItem.type}
          onComplete={
            currentItem.type === 'video' ? handleVideoComplete : undefined
          }
          isLastItem={nextItemId === null}
        />
      </div>

      {/* 강의 제목 */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{currentItem.title}</h2>
      </div>

      {/* 이전/다음 버튼 */}
      <NavigationButtons
        onPrevious={handlePrevious}
        onNext={
          nextItemId === null
            ? handleCourseCompletion
            : currentItem?.type === 'text'
              ? handleTextComplete
              : handleNext
        }
        hasPrevious={prevItemId !== null}
        hasNext={nextItemId !== null}
        isLastItem={nextItemId === null}
        currentItemType={currentItem.type}
        isCourseCompleted={isCourseCompleted}
      />

      {/* 커리큘럼 토글 */}
      <div
        className="my-4 flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-3"
        onClick={() => setShowCurriculum(!showCurriculum)}
      >
        <h3 className="font-medium">커리큘럼</h3>
        {showCurriculum ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {/* 커리큘럼 */}
      {showCurriculum && (
        <LectureCurriculum
          sections={sections}
          currentItemId={currentItem.id}
          onItemSelect={handleItemSelect}
          lectureId={lectureId}
        />
      )}

      {/* 완료 모달 */}
      {showCompletionModal && (
        <CompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          isLastVideo={nextItemId === null}
          onNextVideo={handleModalNextClick}
        />
      )}
    </div>
  );
}
