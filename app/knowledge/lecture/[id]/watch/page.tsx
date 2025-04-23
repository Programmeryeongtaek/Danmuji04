'use client';

import CompletionModal from '@/components/common/CompletionModal';
import { useToast } from '@/components/common/Toast/Context';

import LectureCurriculum from '@/components/knowledge/lecture/watch/LectureCurriculum';
import NavigationButtons from '@/components/knowledge/lecture/watch/NavigationButtons';
import VideoPlayer from '@/components/knowledge/lecture/watch/VideoPlayer';
import { Lecture } from '@/app/types/knowledge/lecture';
import { LectureItem, LectureSection } from '@/app/types/lectureFrom';
import {
  createClient,
  getCompletedItems,
  getLastWatchedItem,
  markItemAsCompleted,
  saveLastWatchedItem,
} from '@/utils/supabase/client';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
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
  const { showToast } = useToast();

  // URL에서 시작 아이템 ID 확인
  const initialItemId = searchParams.get('item')
    ? Number(searchParams.get('item'))
    : null;

  const [isLoading, setIsLoading] = useState(true);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [sections, setSections] = useState<LectureSection[]>([]);
  const [currentItem, setCurrentItem] = useState<LectureItem | null>(null);
  const [prevItemId, setPrevItemId] = useState<number | null>(null);
  const [nextItemId, setNextItemId] = useState<number | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // 로컬 스토리지 대신 일반 state 사용
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [completedItems, setCompletedItems] = useState<number[]>([]);

  // 업데이트 상태를 추적하는 ref - 상태 변경으로 리렌더링을 일으키지 않도록
  const isUpdatingRef = useRef(false);
  const lastWatchedItemRef = useRef<number | null>(null);

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

  // 모든 아이템들의 플랫한 리스트 생성 - 이 값을 메모이제이션하여 의존성 문제 방지
  const allItems = sections.flatMap((section) => section.lecture_items || []);

  // 진도 데이터 로드 - sections이 로드된 후 한 번만 실행하도록 수정
  useEffect(() => {
    const loadProgressData = async () => {
      if (isLoading || allItems.length === 0) return;

      try {
        // 완료된 아이템 목록 가져오기
        const items = await getCompletedItems(Number(lectureId));
        setCompletedItems(items || []);

        // 모든 아이템이 완료되었는지 확인
        if (items.length > 0 && items.length === allItems.length) {
          setIsCourseCompleted(true);
        }
      } catch (error) {
        console.error('진도 데이터 로드 실패:', error);
      }
    };

    loadProgressData();
  }, [lectureId, isLoading, allItems.length]);

  // 초기 아이템 설정 - sections이 로드된 후 한 번만 실행
  useEffect(() => {
    const initializeCurrentItem = async () => {
      if (isLoading || sections.length === 0 || allItems.length === 0) {
        return;
      }

      // 이미 currentItem이 설정되어 있다면 다시 설정하지 않음
      if (currentItem) return;

      console.log('초기 아이템 설정 시작, 총 아이템 수:', allItems.length); // 디버깅용

      let itemToUse = null;

      // 1. URL에서 지정된 아이템 체크
      if (initialItemId) {
        console.log('URL에서 지정된 아이템 ID:', initialItemId);
        itemToUse = allItems.find((item) => item.id === initialItemId);
        if (itemToUse) {
          console.log('URL에서 지정된 아이템 사용:', itemToUse.title);
        }
      }

      // 2. 마지막 시청 아이템 체크
      if (!itemToUse) {
        try {
          console.log('마지막 시청 위치 조회 시도, lectureId:', lectureId);
          // lectureId가 문자열일 수 있으므로 숫자로 변환
          const numericLectureId = parseInt(lectureId as string, 10);

          // 변환 결과가 유효한지 확인
          if (isNaN(numericLectureId)) {
            console.error('강의 ID 변환 실패:', lectureId);
          } else {
            const lastItemId = await getLastWatchedItem(numericLectureId);
            console.log('마지막 시청 아이템 ID:', lastItemId);

            if (lastItemId) {
              itemToUse = allItems.find((item) => item.id === lastItemId);
              if (itemToUse) {
                console.log('마지막 시청 아이템 사용:', itemToUse.title);
              } else {
                console.log(
                  '마지막 시청 아이템을 찾을 수 없음, ID:',
                  lastItemId
                );
                console.log(
                  '사용 가능한 아이템 ID 목록:',
                  allItems.map((item) => item.id)
                );
              }
            } else {
              console.log('저장된 마지막 시청 위치 없음');
            }
          }
        } catch (error) {
          console.error('마지막 시청 위치 조회 실패:', error);
        }
      }

      // 3. 아직 아이템이 선택되지 않았다면 첫 번째 아이템 사용
      if (!itemToUse && allItems.length > 0) {
        itemToUse = allItems[0];
        console.log('첫 번째 아이템 사용:', itemToUse.title);
      }

      if (itemToUse) {
        console.log('최종 선택된 아이템:', itemToUse.title);
        setCurrentItem(itemToUse);
      } else {
        console.error('아이템을 찾을 수 없음');
      }
    };

    initializeCurrentItem();
  }, [isLoading, sections, initialItemId, allItems, currentItem, lectureId]);

  // 현재 아이템이 변경될 때 이전/다음 아이템 설정 및 마지막 시청 위치 저장
  useEffect(() => {
    if (!currentItem || allItems.length === 0) return;

    const currentIndex = allItems.findIndex(
      (item) => item.id === currentItem.id
    );

    // 이전/다음 아이템 ID 설정
    setPrevItemId(currentIndex > 0 ? allItems[currentIndex - 1].id : null);
    setNextItemId(
      currentIndex < allItems.length - 1 ? allItems[currentIndex + 1].id : null
    );

    // 마지막 시청 위치를 서버에 저장 (중복 API 호출 방지)
    if (
      lastWatchedItemRef.current !== currentItem.id &&
      !isUpdatingRef.current
    ) {
      isUpdatingRef.current = true;
      lastWatchedItemRef.current = currentItem.id;

      saveLastWatchedItem(Number(lectureId), currentItem.id)
        .then(() => {
          console.log('마지막 시청 위치 저장 성공:', currentItem.id);
        })
        .catch((error) => {
          console.error('마지막 시청 위치 저장 실패:', error);
        })
        .finally(() => {
          isUpdatingRef.current = false;
        });
    }
  }, [currentItem, allItems, lectureId]);

  // 아이템 선택 핸들러
  const handleItemSelect = (item: LectureItem) => {
    if (currentItem?.id !== item.id) {
      setCurrentItem(item);
    }
  };

  // 이전 아이템으로 이동
  const handlePrevious = () => {
    if (!prevItemId) return;

    const prevItem = allItems.find((item) => item.id === prevItemId);
    if (prevItem) {
      setCurrentItem(prevItem);
    }
  };

  // 다음 아이템으로 이동
  const handleNext = () => {
    if (!nextItemId) return;

    const nextItem = allItems.find((item) => item.id === nextItemId);
    if (nextItem) {
      setCurrentItem(nextItem);
    }
  };

  // 완료 모달 닫기 및 다음 이동
  const handleModalNextClick = () => {
    setShowCompletionModal(false);
    handleNext();
  };

  // 코스 완료 처리
  const handleCourseCompletion = async () => {
    if (!currentItem) return;

    // 현재 아이템이 완료되지 않았다면 완료 처리
    if (!completedItems.includes(currentItem.id)) {
      await markItemComplete(currentItem.id);
    }

    // 모달 표시
    setShowCompletionModal(true);
  };

  // 아이템 완료 처리 (서버 API 호출)
  const markItemComplete = async (itemId: number) => {
    if (completedItems.includes(itemId) || isUpdatingRef.current) return;

    try {
      // 업데이트 중 플래그 설정
      isUpdatingRef.current = true;

      // UI를 먼저 업데이트하여 사용자 경험 향상
      setCompletedItems((prev) => {
        const newItems = [...prev, itemId];

        // 모든 아이템이 완료되었는지 확인
        if (allItems.length > 0 && newItems.length === allItems.length) {
          setIsCourseCompleted(true);
        }

        return newItems;
      });

      // DB에 완료 상태 저장
      await markItemAsCompleted(Number(lectureId), itemId);
    } catch (error) {
      console.error('아이템 완료 처리 실패:', error);

      // 에러 발생 시 UI 상태 원복
      setCompletedItems((prev) => prev.filter((id) => id !== itemId));

      showToast('진도 저장에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      isUpdatingRef.current = false;
    }
  };

  // 비디오 완료 처리
  const handleVideoComplete = () => {
    if (!currentItem) return;

    // 아이템 완료 처리
    markItemComplete(currentItem.id);

    // 다음 아이템으로 이동 또는 코스 완료 처리
    if (nextItemId === null) {
      handleCourseCompletion();
    } else {
      handleNext();
    }
  };

  // 텍스트 완료 처리
  const handleTextComplete = () => {
    if (!currentItem) return;

    // 아이템 완료 처리
    markItemComplete(currentItem.id);

    // 모달 표시
    setShowCompletionModal(true);
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
      <div className="mx-auto max-w-6xl px-4">
        {/* 상단 네비게이션 */}
        <div className="mb-6 flex items-center gap-2">
          <Link
            href={`/knowledge/lecture/${lectureId}`}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>강의 상세로 돌아가기</span>
          </Link>
        </div>
      </div>

      {/* 제목 및 정보 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{lecture.title}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
          <span>{lecture.category}</span>
          <span>•</span>
          <span>{lecture.instructor}</span>
        </div>
      </div>

      {/* 비디오 플레이어 */}
      <div className="mb-6 overflow-hidden rounded-lg bg-black shadow-lg">
        <VideoPlayer
          contentUrl={currentItem.content_url || ''}
          type={currentItem.type}
          onComplete={handleVideoComplete}
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
        isLastItem={nextItemId === null}
        isCurrentItemCompleted={completedItems.includes(currentItem.id)}
        isCourseCompleted={isCourseCompleted} // 추가
      />

      {/* 커리큘럼 */}
      <LectureCurriculum
        sections={sections}
        currentItemId={currentItem.id}
        onItemSelect={handleItemSelect}
        completedItems={completedItems} // 현재 completedItems 상태 전달
      />

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
