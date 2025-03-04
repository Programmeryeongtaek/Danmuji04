'use client';

import Button from '@/components/common/Button/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  isLastItem?: boolean;
  currentItemType?: 'video' | 'text';
  onComplete?: () => void; // 완료 처리 함수 추가
  isCourseCompleted?: boolean;
}

export default function NavigationButtons({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  isLastItem = false,
  isCourseCompleted = false,
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between">
      <Button
        onClick={onPrevious}
        disabled={!hasPrevious}
        className={`flex items-center ${
          !hasPrevious ? 'cursor-not-allowed opacity-50' : ''
        }`}
      >
        <ChevronLeft className="mr-1 h-5 w-5" />
        이전 강의
      </Button>

      {/* 마지막 강의이고 코스가 완료된 경우에는 비활성화된 Button 사용 */}
      <Button
        onClick={isLastItem && isCourseCompleted ? undefined : onNext}
        disabled={isLastItem && isCourseCompleted}
        className={`flex items-center ${
          isLastItem && isCourseCompleted
            ? 'cursor-not-allowed bg-gray-300 opacity-50'
            : !hasNext
              ? 'cursor-not-allowed opacity-50'
              : ''
        }`}
      >
        {isLastItem && isCourseCompleted ? '수강 완료됨' : '학습 완료'}
        <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  );
}
