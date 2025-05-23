'use client';

import ProgressBar from '@/components/common/ProgressBar';
import { LectureItem, LectureSection } from '@/app/types/knowledge/lectureForm';
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
  onItemSelect: (item: LectureItem) => void;
  completedItems: number[]; // 부모로부터 완료된 항목 목록 전달받음
}

export default function LectureCurriculum({
  sections,
  currentItemId,
  onItemSelect,
  completedItems, // 부모로부터 전달받은 props
}: LectureCurriculumProps) {
  // 완료된 항목 상태 관리 (로컬 스토리지 대신 일반 상태 사용)
  const [progressState, setProgressState] = useState({
    completed: 0,
    total: 0,
  });

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

  // 모든 아이템 수와 완료된 아이템 수 계산
  useEffect(() => {
    let totalItems = 0;

    sections.forEach((section) => {
      if (section.lecture_items) {
        totalItems += section.lecture_items.length;
      }
    });

    setProgressState({
      completed: completedItems.length,
      total: totalItems,
    });
  }, [sections, completedItems]);

  // 섹션 토글 함수
  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // 아이템이 완료되었는지 확인
  const isItemCompleted = (itemId: number) => {
    return completedItems.includes(itemId);
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
