'use client';

import Button from '@/components/common/Button/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export default function NavigationButtons({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
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
        disabled={!hasNext}
        className={`flex items-center ${
          !hasNext ? 'cursor-not-allowed opacity-50' : ''
        }`}
      >
        다음 강의
        <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  );
}
