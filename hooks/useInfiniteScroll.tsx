'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions<T, D = unknown> {
  // 초기 데이터 (선택 사항)
  initialData?: T[];

  // 데이터를 가져오는 함수 (페이지 번호를 받아 데이터 배열을 반환하는 Promise)
  fetchData: (page: number) => Promise<T[]>;

  // 한 페이지당 아이템 수 (무한 스크롤 종료 조건에 사용)
  pageSize?: number;

  // 로드 전 여유 공간 (픽셀) - Observer가 감지할 거리
  threshold?: number;

  // 관찰할 대상 요소의 루트 마진 (Intersection Observer 옵션)
  rootMargin?: string;

  // 첫 페이지 번호 (기본값 1)
  initialPage?: number;

  // 자동으로 첫 페이지를 로드할지 여부
  autoLoad?: boolean;

  // 의존성 배열 (선택 사항) - 값이 변경될 때 데이터를 다시 로드
  dependencies?: D[];
}

interface UseInfiniteScrollResult<T> {
  // 현재까지 로드된 모든 데이터
  data: T[];

  // 데이터 로딩 중 여부
  isLoading: boolean;

  // 더 불러올 데이터가 있는지 여부
  hasMore: boolean;

  // 다음 페이지 데이터를 수동으로 로드하는 함수
  loadMore: () => Promise<void>;

  // 관찰 대상 요소에 연결할 ref (리스트 맨 아래에 배치)
  observerRef: (node: HTMLElement | null) => void;

  // 에러 객체 (에러 발생 시)
  error: Error | null;

  // 모든 상태를 초기화하고 처음부터 다시 로드하는 함수
  reset: () => void;

  // 현재 페이지 번호
  page: number;
}

// 무한 스크롤을 구현하기 위한 커스텀 훅
// Intersection Observer API를 사용하여 효율적으로 스크롤 감지
export function useInfiniteScroll<T, D = unknown>({
  initialData = [],
  fetchData,
  pageSize = 10,
  threshold = 0.5,
  rootMargin = '0px 0px 200px 0px', // 기본적으로 하단에서 200px 전에 로드 시작
  initialPage = 1,
  autoLoad = true,
  dependencies = [],
}: UseInfiniteScrollOptions<T, D>): UseInfiniteScrollResult<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // observer에 연결할 ref 객체와 콜백
  const observer = useRef<IntersectionObserver | null>(null);

  // 데이터 로드 함수
  const loadData = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const newItems = await fetchData(page);

      // 더 불러올 데이터가 없는 경우 (빈 배열이거나 pageSize보다 적은 경우)
      if (newItems.length === 0 || (pageSize && newItems.length < pageSize)) {
        setHasMore(false);
      }

      setData((prevData) => [...prevData, ...newItems]);
      setPage((prevPage) => prevPage + 1);
    } catch (error) {
      setError(
        error instanceof Error
          ? error
          : new Error('데이터를 불어오는 중 오류가 발생했습니다.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, page, isLoading, hasMore, pageSize]);

  // 관찰 대상 요소와 Observer 연결하는 콜백 함수
  const observerRef = useCallback(
    (node: HTMLElement | null) => {
      if (isLoading) return;

      // 이전 Observer 연결 해제
      if (observer.current) {
        observer.current.disconnect();
      }

      // 새 Observer 생성
      observer.current = new IntersectionObserver(
        (entries) => {
          // 관찰 대상이 화면에 들어오면 데이터 로드
          if (entries[0].isIntersecting && hasMore && !isLoading) {
            loadData();
          }
        },
        {
          threshold, // 요소가 얼마나 보여야 콜백을 실행할지 (0 ~ 1)
          rootMargin, // 루트 요소의 마진 (관찰 영역 확장)
        }
      );

      // 새 노드 관찰 시작
      if (node) {
        observer.current.observe(node);
      }
    },
    [isLoading, hasMore, loadData, threshold, rootMargin]
  );

  // 초기 데이터 로드
  useEffect(() => {
    if (autoLoad && hasMore && data.length === 0 && !isLoading) {
      loadData();
    }

    // 컴포넌트 언마운트 시 Observer 정리
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [autoLoad, hasMore, data.length, isLoading, loadData, ...dependencies]);

  // 상태 초기화 함수
  const reset = useCallback(() => {
    setData(initialData);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
    setIsLoading(false);
  }, [initialData, initialPage]);

  return {
    data,
    isLoading,
    hasMore,
    loadMore: loadData,
    observerRef,
    error,
    reset,
    page: page - 1, // 현재 페이지는 다음에 로드할 페이지 - 1
  };
}
