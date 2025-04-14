'use client';

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { ReactNode } from 'react';

// 아이템 렌더링을 위한 props 타입
interface InfiniteListProps<T> {
  // 아이템을 렌더링하는 함수
  renderItem: (item: T, index: number) => ReactNode;

  // 데이터를 가져오는 함수
  fetchData: (page: number) => Promise<T[]>;

  // 빈 목록일 떄 표시할 컴포넌트
  emptyComponent?: ReactNode;

  // 로딩 중일 때 표시할 컴포넌트
  loadingComponent?: ReactNode;

  // 에러 발생 시 표시할 컴포넌트 렌더링 함수
  errorComponent?: (error: Error, retry: () => void) => ReactNode;

  // 모든 데이터를 불러왔을 때 표시할 컴포넌트
  endComponent?: ReactNode;

  // 한 페이지당 아이템 수
  pageSize?: number;

  // 첫 페이지 번호
  initialPage?: number;

  // 아이템에 적용할 CSS 클래스
  itemClassName?: string;

  // 컨테이너에 적용할 CSS 클래스
  className?: string;

  // 초기 데이터
  initialData?: T[];

  // 로드 전 여유 공간 (픽셀) - Observer가 감지할 거리
  rootMargin?: string;

  // itemKey ㅛㅐㅇ성 함수
  keyExtractor?: (item: T, index: number) => string | number;

  // 데이터 필터링 함수
  filterData?: (items: T[]) => T[];
}

// 무한 스크롤 기능을 가진 리스트 컴포넌트
export function InfiniteList<T>({
  renderItem,
  fetchData,
  emptyComponent,
  loadingComponent,
  errorComponent,
  endComponent,
  pageSize = 10,
  initialPage = 1,
  itemClassName = '',
  className = '',
  initialData = [],
  rootMargin = '0px 0px 200px 0px',
  keyExtractor,
  filterData,
}: InfiniteListProps<T>) {
  const {
    data: items,
    isLoading,
    hasMore,
    observerRef,
    error,
    reset,
  } = useInfiniteScroll<T>({
    fetchData,
    pageSize,
    initialPage,
    initialData,
    rootMargin,
  });

  // 필터링된 데이터
  const displayItems = filterData ? filterData(items) : items;

  // 기본 로딩 컴포넌트
  const defaultLoadingComponent = (
    <div className="flex items-center justify-center p-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
      <span className="ml-2 text-gray-600">불러오는 중...</span>
    </div>
  );

  // 기본 에러 컴포넌트
  const defaultErrorComponent = (error: Error, retry: () => void) => (
    <div className="my-4 rounded-lg bg-red-100 p-4 text-red-700">
      <p className="font-medium">데이터를 불러오는데 문제가 발생했습니다</p>
      <p>{error.message}</p>
      <button
        onClick={retry}
        className="mt-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
      >
        다시 시도
      </button>
    </div>
  );

  // 기본 빈 컴포넌트
  const defaultEmptyComponent = (
    <div className="my-8 text-center text-gray-500">데이터가 없습니다.</div>
  );

  // 기본 종료 컴포넌트
  const defaultEndComponent = (
    <div className="my-4 text-center text-gray-500">
      모든 항목을 불러왔습니다.
    </div>
  );

  return (
    <div className={className}>
      {/* 아이템 목록 */}
      {displayItems.map((item, index) => (
        <div
          key={keyExtractor ? keyExtractor(item, index) : index}
          className={itemClassName}
        >
          {renderItem(item, index)}
        </div>
      ))}

      {/* 에러 표시 */}
      {error &&
        (errorComponent
          ? errorComponent(error, reset)
          : defaultErrorComponent(error, reset))}

      {/* 로딩 표시기 */}
      {hasMore && (
        <div ref={observerRef}>
          {isLoading && (loadingComponent || defaultLoadingComponent)}
        </div>
      )}

      {/* 빈 목록 표시 */}
      {!isLoading &&
        displayItems.length === 0 &&
        (emptyComponent || defaultEmptyComponent)}

      {/* 목록 끝 표시 */}
      {!hasMore &&
        displayItems.length > 0 &&
        (endComponent || defaultEndComponent)}
    </div>
  );
}
