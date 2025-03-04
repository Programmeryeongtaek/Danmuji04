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
}

export default function NavigationButtons({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  isLastItem = false,
  currentItemType = 'video',
  onComplete,
}: NavigationButtonsProps) {
  // 텍스트 콘텐츠의 경우 완료 처리 후 다음으로 이동
  const handleNextOrComplete = () => {
    if (currentItemType === 'text' && onComplete) {
      onComplete(); // 완료 처리
    } else {
      onNext(); // 일반적인 다음 처리
    }
  };

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
        onClick={handleNextOrComplete}
        disabled={!hasNext && currentItemType !== 'text'} // 텍스트면 마지막이어도 완료 가능
        className="flex items-center"
      >
        {isLastItem
          ? '학습 완료'
          : currentItemType === 'text'
            ? '완료'
            : '다음 강의'}
        <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  );
}
