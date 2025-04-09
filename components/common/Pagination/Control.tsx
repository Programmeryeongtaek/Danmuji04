import { PaginationControlProps } from './Types';
import { usePaginationContext } from './Context';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Control({
  direction,
  disabled: disabledProp,
  className = '',
}: PaginationControlProps) {
  const { currentPage, totalPages, onPageChange } = usePaginationContext();

  // disabled prop이 제공되면 그 값을 사용하고, 그렇지 않으면 자동 계산
  const disabled =
    disabledProp !== undefined
      ? disabledProp
      : direction === 'prev'
        ? currentPage === 1
        : currentPage >= totalPages;

  const handleClick = () => {
    if (disabled) return;

    if (direction === 'prev') {
      onPageChange(currentPage - 1);
    } else {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`rounded border px-3 py-1 text-sm ${
        disabled
          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
          : 'text-gray-700 hover:bg-gray-50'
      } ${className}`}
      aria-label={direction === 'prev' ? '이전 페이지' : '다음 페이지'}
    >
      {direction === 'prev' ? (
        <div className="flex items-center">
          <ChevronLeft className="mr-1 h-4 w-4" />
          <span>이전</span>
        </div>
      ) : (
        <div className="flex items-center">
          <span>다음</span>
          <ChevronRight className="ml-1 h-4 w-4" />
        </div>
      )}
    </button>
  );
}
