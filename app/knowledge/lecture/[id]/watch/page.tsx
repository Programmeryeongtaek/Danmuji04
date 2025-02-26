'use client';

import LectureCurriculum from '@/components/knowledge/lecture/watch/LectureCurriculum';
import NavigationButtons from '@/components/knowledge/lecture/watch/NavigationButtons';
import VideoPlayer from '@/components/knowledge/lecture/watch/VideoPlayer';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Lecture } from '@/types/knowledge/lecture';
import { LectureItem, LectureSection } from '@/types/lectureFrom';
import { createClient } from '@/utils/supabase/client';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useParams } from 'next/navigation';
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
  const lectureId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [sections, setSections] = useState<LectureSection[]>([]);
  const [currentItem, setCurrentItem] = useState<LectureItem | null>(null);
  const [showCurriculum, setShowCurriculum] = useState(true);
  const [prevItemId, setPrevItemId] = useState<number | null>(null);
  const [nextItemId, setNextItemId] = useState<number | null>(null);

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

  // 초기 아이템 설정
  useEffect(() => {
    if (allItems.length > 0 && !currentItem) {
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
  }, [allItems, lectureId, currentItem, lastWatchedItems]);

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
  }, [currentItem, allItems, lectureId]); // lastWatchedItems 제외

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
        />
      </div>

      {/* 강의 제목 */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{currentItem.title}</h2>
      </div>

      {/* 이전/다음 버튼 */}
      <NavigationButtons
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={prevItemId !== null}
        hasNext={nextItemId !== null}
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
    </div>
  );
}
