'use client';

import Button from '@/components/common/Button/Button';
import { ChevronLeft } from 'lucide-react';

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
        className={`flex items-center px-2 py-1 ${
          !hasPrevious ? 'cursor-not-allowed opacity-50' : ''
        }`}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        onClick={onNext}
        // 마지막 아이템이면서 (완료되었거나 코스가 완료됨으로 표시된 경우) 비활성화
        disabled={isLastItem && (isCurrentItemCompleted || isCourseCompleted)}
        className={`flex items-center px-4 ${
          isLastItem && (isCurrentItemCompleted || isCourseCompleted)
            ? 'cursor-not-allowed bg-gray-300 opacity-50'
            : ''
        }`}
      >
        {isLastItem && (isCurrentItemCompleted || isCourseCompleted)
          ? '수강 완료'
          : '완료'}
      </Button>
    </div>
  );
}
