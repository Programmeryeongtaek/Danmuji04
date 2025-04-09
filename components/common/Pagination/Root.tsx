import { useEffect, useState } from 'react';
import { PaginationRootProps } from './Types';
import { PaginationContext } from './Context';

export default function Root({
  children,
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationRootProps) {
  const [totalPages, setTotalPages] = useState(1);

  // 총 페이지 수 계산
  useEffect(() => {
    const calculatedTotalPages = Math.max(
      1,
      Math.ceil(totalItems / itemsPerPage)
    );
    setTotalPages(calculatedTotalPages);
  }, [totalItems, itemsPerPage]);

  // 형제 페이지가 유효한 범위 내에 있는지 확인하고 조정
  useEffect(() => {
    if (currentPage < 1) {
      onPageChange(1);
    } else if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  return (
    <PaginationContext.Provider
      value={{
        currentPage,
        totalPages,
        onPageChange,
      }}
    >
      {totalPages > 1 ? children : null}
    </PaginationContext.Provider>
  );
}
