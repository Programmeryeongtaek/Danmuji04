// 페이지 번호 목록 계산을 위한 유틸리티 함수
export function generatePageRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): (number | 'ellipsis')[] {
  // 항상 현재 페이지, 양쪽의 형제 페이지, 첫 페이지와 마지막 페이지를 포함
  // 그리고 필요한 경우 줄임표를 표시

  const range = (start: number, end: number) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, index) => start + index);
  };

  // 기본 페이지 범위 게싼
  const totalPageNumbers = siblingCount * 2 + 3; // 양쪽 형재 + 현재 + 첫/마지막

  // 전체 페이지가 표시할 페이지 수보다 적은 경우
  if (totalPageNumbers > totalPages) {
    return range(1, totalPages);
  }

  // 좌측 형제의 인덱스
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  // 우측 형제의 인덱스
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  // 첫 페이지와 좌측 형제 사이에 줄임표가 필요한지
  const shouldShowLeftDots = leftSiblingIndex > 2;
  // 우측 형제와 마지막 페이지 사이에 줄임표가 필요한지
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  // 첫 페이지는 항상 표시
  const firstPageIndex = 1;
  // 마지막 페이지는 항상 표시
  const lastPageIndex = totalPages;

  // 경우 1: 좌측 줄임표만 표시
  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 1 + 2 * siblingCount;
    const leftRange = range(1, leftItemCount);

    return [...leftRange, 'ellipsis', totalPages];
  }

  // 경우 2: 우측 줄임표만 표시
  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 1 + 2 * siblingCount;
    const rightRange = range(totalPages - rightItemCount + 1, totalPages);

    return [firstPageIndex, 'ellipsis', ...rightRange];
  }

  // 경우 3: 양쪽 줄임표 표시
  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = range(leftSiblingIndex, rightSiblingIndex);

    return [
      firstPageIndex,
      'ellipsis',
      ...middleRange,
      'ellipsis',
      lastPageIndex,
    ];
  }

  // 기본적으로 빈 배열 반환 (도달할 일 없음)
  return [];
}
