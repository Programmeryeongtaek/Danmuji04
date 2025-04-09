import { usePaginationContext } from './Context';
import { generatePageRange } from './generatePagePange';
import { PaginationListProps } from './Types';

export default function List({ className = '' }: PaginationListProps) {
  const { currentPage, totalPages, onPageChange } = usePaginationContext();

  // 표시할 페이지 번호 배열 생성
  const pageRange = generatePageRange(currentPage, totalPages);

  return (
    <div className={`flex gap-2 ${className}`}>
      {pageRange.map((page, index) => {
        // 줄임표 표시
        if (page === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex h-8 w-8 items-center justify-center text-gray-500"
            >
              ...
            </span>
          );
        }

        // 페이지 번호 버튼
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`h-8 w-8 rounded ${
              currentPage === page
                ? 'bg-gold-start text-white'
                : 'border text-gray-700 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        );
      })}
    </div>
  );
}
