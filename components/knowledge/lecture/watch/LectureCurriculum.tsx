'use client';

import ProgressBar from '@/components/common/ProgressBar';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LectureItem, LectureSection } from '@/types/lectureFrom';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Play,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface LectureCurriculumProps {
  sections: LectureSection[];
  currentItemId: number;
  lectureId: string;
  onItemSelect: (item: LectureItem) => void;
}

export default function LectureCurriculum({
  sections,
  currentItemId,
  lectureId,
  onItemSelect,
}: LectureCurriculumProps) {
  // 완료된 강의 항목 저장
  const [completedItems, setCompletedItems] = useLocalStorage<
    Record<string, number[]>
  >('completedLectureItems', {});

  // 현재 강의의 완료된 항목들
  const currentLectureCompleted = completedItems[lectureId] || [];

  const [expandedSections, setExpandedSections] = useState<
    Record<number, boolean>
  >(
    // 기본적으로 모든 섹션을 펼침
    sections.reduce(
      (acc, section) => {
        acc[section.id] = true;
        return acc;
      },
      {} as Record<number, boolean>
    )
  );

  // 진행률 계산을 위한 상태 추가
  const [progressState, setProgressState] = useState({
    completed: 0,
    total: 0,
  });

  // 모든 아이템 수와 완료된 아이템 수 계산
  useEffect(() => {
    let totalItems = 0;

    sections.forEach((section) => {
      if (section.lecture_items) {
        totalItems += section.lecture_items.length;
      }
    });

    setProgressState({
      completed: currentLectureCompleted.length,
      total: totalItems,
    });
  }, [sections, currentLectureCompleted]);

  useEffect(() => {
    // 초기 데이터 로딩 시 로그
    console.log('로드된 섹션 데이터:', sections);

    // 모든 강의 아이템의 duration 값 확인
    sections.forEach((section) => {
      section.lecture_items?.forEach((item) => {
        console.log(
          `아이템 ID ${item.id}, 타입: ${item.type}, 제목: ${item.title}, duration: ${item.duration}`
        );
      });
    });
  }, [sections]);

  useEffect(() => {
    // 모든 아이템의 시간 정보 로깅
    sections.forEach((section) => {
      section.lecture_items?.forEach((item) => {
        console.log(
          `강의 ID: ${item.id}, 제목: ${item.title}, 시간: ${item.duration}`
        );
      });
    });
  }, [sections]);

  useEffect(() => {
    if (currentItemId) {
      // 모든 섹션을 순회하여 현재 아이템 찾기
      let currentItem = null;

      sections.forEach((section) => {
        section.lecture_items?.forEach((item) => {
          if (item.id === currentItemId) {
            currentItem = item;
          }
        });
      });

      // 타입 단언 사용
      if (currentItem && (currentItem as { type?: string }).type === 'video') {
        markItemAsCompleted(currentItemId);
      }
    }
  }, [currentItemId, sections]);

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // 아이템을 완료 상태로 표시
  const markItemAsCompleted = (itemId: number) => {
    if (!currentLectureCompleted.includes(itemId)) {
      const updatedCompleted = [...currentLectureCompleted, itemId];

      // 객체를 직접 업데이트
      const newCompletedItems = { ...completedItems };
      newCompletedItems[lectureId] = updatedCompleted;
      setCompletedItems(newCompletedItems);
    }
  };

  // 아이템이 완료되었는지 확인
  const isItemCompleted = (itemId: number) => {
    return currentLectureCompleted.includes(itemId);
  };

  // 시간 형식 변환 (00:00 포맷)
  const formatDuration = (duration: string) => {
    // 빈 값이면 기본값 반환
    if (!duration || duration.trim() === '') {
      return '00:00';
    }

    // 이미 포맷이 맞는 경우 그대로 반환
    if (/^\d{1,2}:\d{2}$/.test(duration)) {
      return duration;
    }

    // 초 단위가 입력된 경우 변환
    const seconds = parseInt(duration, 10);
    if (!isNaN(seconds)) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    return duration || '00:00';
  };

  return (
    <div className="space-y-4">
      {/* 진행률 막대 추가 */}
      <ProgressBar
        current={progressState.completed}
        total={progressState.total}
      />
      <div className="divide-y rounded-lg border">
        {sections.map((section) => (
          <div key={section.id} className="overflow-hidden">
            {/* 섹션 헤더 */}
            <div
              className="flex cursor-pointer items-center justify-between bg-gray-50 p-4"
              onClick={() => toggleSection(section.id)}
            >
              <div className="font-medium">{section.title}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {section.lecture_items?.length || 0}개 강의
                </span>
                {expandedSections[section.id] ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>

            {/* 섹션 콘텐츠 (강의 아이템들) */}
            {expandedSections[section.id] && section.lecture_items && (
              <div className="divide-y bg-white">
                {section.lecture_items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex cursor-pointer items-center p-4 hover:bg-gray-50 ${
                      currentItemId === item.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onItemSelect(item)}
                  >
                    {/* 강의 아이콘 */}
                    <div className="mr-3">
                      {currentItemId === item.id ? (
                        <Play className="h-5 w-5 text-blue-500" />
                      ) : item.type === 'video' ? (
                        <Video className="h-5 w-5 text-gray-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-500" />
                      )}
                    </div>

                    {/* 강의 제목 */}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.title}</div>
                    </div>

                    {/* 오른쪽 영역: 시간 및 완료 표시 */}
                    <div className="flex items-center gap-3">
                      {/* 시간 정보 - 비디오 타입에만 표시 */}
                      {item.type === 'video' && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {/* 로그 추가 */}
                          {console.log &&
                            (() => {
                              console.log(
                                `아이템 ID: ${item.id}, duration: '${item.duration}'`
                              );
                              return null;
                            })()}
                          {formatDuration(
                            item.duration && item.duration !== ''
                              ? item.duration
                              : '00:00'
                          )}
                        </div>
                      )}

                      {/* 완료 표시 */}
                      {isItemCompleted(item.id) && (
                        <div className="flex items-center gap-1">
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                            완료
                          </span>
                          <Check className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
