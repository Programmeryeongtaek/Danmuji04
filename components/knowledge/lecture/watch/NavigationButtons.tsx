'use client';

import Button from '@/components/common/Button/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  isLastItem?: boolean;
  isCurrentItemCompleted?: boolean;
  isCourseCompleted?: boolean;
}

export default function NavigationButtons({
  onPrevious,
  onNext,
  hasPrevious,
  isLastItem = false,
  isCurrentItemCompleted = false,
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

      <Button
        onClick={onNext}
        // 마지막 아이템이면서 (완료되었거나 코스가 완료됨으로 표시된 경우) 비활성화
        disabled={isLastItem && (isCurrentItemCompleted || isCourseCompleted)}
        className={`flex items-center ${
          isLastItem && (isCurrentItemCompleted || isCourseCompleted)
            ? 'cursor-not-allowed bg-gray-300 opacity-50'
            : ''
        }`}
      >
        {isLastItem && (isCurrentItemCompleted || isCourseCompleted)
          ? '수강 완료됨'
          : '학습 완료'}
        <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  );
}
