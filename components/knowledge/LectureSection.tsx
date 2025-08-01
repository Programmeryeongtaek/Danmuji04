'use client';

import Card from '../common/Card';
import KeywordSelector from './KeywordSelector';
import Filter from './Filter';
import { Lecture, LectureSectionProps } from '@/app/types/knowledge/lecture';
import { useEffect, useState } from 'react';
import Dropdown from '../common/Dropdown/Dropdown';
import { SortOption } from '../common/Dropdown/Type';
import { useSearchParams } from 'next/navigation';
import { useBookmarks } from '@/hooks/useBookmarks';
import Pagination from '../common/Pagination';
import { useAtom, useAtomValue } from 'jotai';
import {
  initializeFromUrlAtom,
  searchFilterAtom,
  updateSortOptionAtom,
} from '@/store/knowledge/searchFilterAtom';
import {
  fetchAndCacheLecturesByCategoryAtom,
  fetchAndCacheSearchResultsAtom,
  getCachedLecturesAtom,
  getCachedSearchResultsAtom,
  getCacheLoadingStateAtom,
} from '@/store/knowledge/lectureCacheAtom';

interface ExtendedLectureSectionProps extends LectureSectionProps {
  searchQuery?: string;
}

const categoryLabelMap = new Map([
  ['all', '전체'],
  ['search', '검색'],
  ['humanities', '인문학'],
  ['philosophy', '철학'],
  ['psychology', '심리학'],
  ['economics', '경제학'],
  ['self-development', '자기계발'],
  ['leadership', '리더십'],
]);

const ITEMS_PER_PAGE = 12;

const LectureSection = ({
  selectedCategory,
  searchQuery = '',
}: ExtendedLectureSectionProps) => {
  const searchParams = useSearchParams();
  const querySearchTerm = searchParams.get('q')?.toLowerCase() || '';
  const effectiveSearchQuery = searchQuery || querySearchTerm;

  const searchFilter = useAtomValue(searchFilterAtom);
  const { selectedKeywords, filters: activeFilters, sortOption } = searchFilter;

  const [, initializeFromUrl] = useAtom(initializeFromUrlAtom);
  const [, updateSortOption] = useAtom(updateSortOptionAtom);
  const [, fetchCachedLectures] = useAtom(fetchAndCacheLecturesByCategoryAtom);
  const [, fetchCachedSearchResults] = useAtom(fetchAndCacheSearchResultsAtom);

  const getCachedLecturesList = useAtomValue(getCachedLecturesAtom);
  const getCachedSearchResultsList = useAtomValue(getCachedSearchResultsAtom);
  const getCacheLoading = useAtomValue(getCacheLoadingStateAtom);

  const {
    handleToggleBookmark,
    isLoading: bookmarksLoading,
    isBookmarked,
  } = useBookmarks();

  const [lectureList, setLectureList] = useState<Lecture[]>([]);
  const [prevLectures, setPrevLectures] = useState<Lecture[]>([]);

  const cacheKey = effectiveSearchQuery
    ? `search_${effectiveSearchQuery}_${JSON.stringify(activeFilters)}`
    : `category_${selectedCategory}`;
  const isCacheLoading = getCacheLoading(cacheKey);
  const isLoading = isCacheLoading;

  // 페이지네이션 관련 상태
  const [currentPage, setCurrentPage] = useState(1);

  // URL 파라미터 초기화
  useEffect(() => {
    const params = {
      q: searchParams.get('q') || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      keywords: searchParams.get('keywords') || undefined,
      depth: searchParams.get('depth') || undefined,
      fields: searchParams.get('fields') || undefined,
      hasGroup: searchParams.get('hasGroup') || undefined,
      sort: searchParams.get('sort') || undefined,
    };

    initializeFromUrl(params);
  }, []);

  // 전역상태 변경 시 강의 데이터 가져오기
  useEffect(() => {
    const loadLectures = async () => {
      try {
        // 이전 데이터 유지
        if (lectureList.length > 0) {
          setPrevLectures(lectureList);
        }

        let data: Lecture[] = [];

        if (effectiveSearchQuery) {
          // 🎯 검색 결과 캐시에서 가져오기 또는 새로 조회
          const cachedResults = getCachedSearchResultsList(
            effectiveSearchQuery,
            activeFilters
          );
          if (cachedResults) {
            data = cachedResults; // 🔥 이제 타입이 일치함
          } else {
            await fetchCachedSearchResults(effectiveSearchQuery, activeFilters);
            const freshResults = getCachedSearchResultsList(
              effectiveSearchQuery,
              activeFilters
            );
            data = freshResults || [];
          }
        } else {
          // 🎯 카테고리별 강의 캐시에서 가져오기 또는 새로 조회
          const categoryLabel =
            selectedCategory === 'all'
              ? 'all'
              : categoryLabelMap.get(selectedCategory) || selectedCategory;
          const cachedLectures = getCachedLecturesList(categoryLabel);
          if (cachedLectures) {
            data = cachedLectures; // 🔥 이제 타입이 일치함
          } else {
            await fetchCachedLectures(categoryLabel);
            const freshLectures = getCachedLecturesList(categoryLabel);
            data = freshLectures || [];
          }
        }

        // 정렬 적용
        const sortedData = applySorting(data, sortOption);
        setLectureList(sortedData);

        // 카테고리나 검색어가 변경되면 페이지를 1로 리셋
        setCurrentPage(1);
      } catch (error) {
        console.error('Failed to fetch lectures:', error);
      }
    };

    loadLectures();
  }, [selectedCategory, effectiveSearchQuery, activeFilters, sortOption]);

  // 정렬 적용 함수
  const applySorting = (lectures: Lecture[], sort: string): Lecture[] => {
    return [...lectures].sort((a, b) => {
      switch (sort) {
        case 'latest':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'popular':
        case 'students':
          return b.students - a.students;
        case 'rating':
        case 'likes':
          return b.likes - a.likes;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
  };

  // 필터 파라미터나 키워드가 변경될 때마다 페이지네이션 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKeywords, activeFilters]);

  // 키워드가 강의 keyword 필드에 포함되어 있는지 확인하는 함수
  const hasMatchingKeyword = (
    lecture: Lecture,
    searchKeywords: string[]
  ): boolean => {
    if (!searchKeywords.length) return true;
    if (!lecture.keyword) return false;

    const lectureKeywords = lecture.keyword
      .split(',')
      .map((k) => k.trim().toLowerCase());

    return searchKeywords.some((searchKeyword) =>
      lectureKeywords.includes(searchKeyword.toLowerCase())
    );
  };

  // 필터링 로직 (전역상태 기반)
  const filteredLectures = lectureList.filter((lecture) => {
    // 키워드 필터링
    if (
      selectedKeywords.length > 0 &&
      !hasMatchingKeyword(lecture, selectedKeywords)
    ) {
      return false;
    }

    // 필터 적용
    if (
      activeFilters.depth.length > 0 &&
      !activeFilters.depth.includes(lecture.depth)
    ) {
      return false;
    }
    if (
      activeFilters.fields.length > 0 &&
      !activeFilters.fields.includes(lecture.category)
    ) {
      return false;
    }
    if (activeFilters.hasGroup && lecture.group_type !== '오프라인') {
      return false;
    }

    return true;
  });

  // 정렬 핸들러 (전역상태 업데이트)
  const handleSort = (option: SortOption) => {
    updateSortOption(option);
  };

  // 페이지네이션 처리
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredLectures.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  // 페이지 변경 핸들러
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading || bookmarksLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="flex flex-col px-4">
      {effectiveSearchQuery && (
        <div className="mb-4">
          <h2 className="text-lg font-medium">
            {effectiveSearchQuery} 검색 결과 ({filteredLectures.length}개)
          </h2>
        </div>
      )}

      {/* 필터 및 정렬 영역 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <KeywordSelector />
          <Filter />
        </div>

        <div className="relative z-40 hover:bg-light">
          <Dropdown.Root onSort={handleSort}>
            <Dropdown.Trigger />
            <Dropdown.Context />
          </Dropdown.Root>
        </div>
      </div>

      {/* 총 결과 수 표시 */}
      <div className="mb-4 text-sm text-gray-600">
        총 {filteredLectures.length}개의 강의
      </div>

      {/* 강의 카드 그리드 */}
      <div className="relative z-10 grid gap-4 mobile:mb-20 mobile:grid-cols-1 sm:grid-cols-2 tablet:grid-cols-3 laptop:grid-cols-4">
        {isLoading ? (
          prevLectures.length > 0 ? (
            prevLectures.slice(0, ITEMS_PER_PAGE).map((lecture) => (
              <div key={lecture.id} className="opacity-50">
                <Card
                  {...lecture}
                  isBookmarked={isBookmarked(lecture.id)}
                  onToggleBookmark={handleToggleBookmark}
                />
              </div>
            ))
          ) : (
            <div className="col-span-full flex justify-center py-8">
              로딩 중...
            </div>
          )
        ) : currentItems.length > 0 ? (
          currentItems.map((lecture) => (
            <Card
              key={lecture.id}
              {...lecture}
              isBookmarked={isBookmarked(lecture.id)}
              onToggleBookmark={handleToggleBookmark}
            />
          ))
        ) : (
          <div className="col-span-full flex justify-center py-8">
            <div className="text-center">
              <p className="mb-2 text-lg font-medium text-gray-700">
                검색 결과가 없습니다.
              </p>
              <p className="text-sm text-gray-500">
                다른 키워드나 필터를 사용해 보세요.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {filteredLectures.length > ITEMS_PER_PAGE && (
        <div className="mt-8 flex justify-center">
          <Pagination.Root
            currentPage={currentPage}
            totalItems={filteredLectures.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          >
            <div className="flex items-center gap-4">
              <Pagination.Control direction="prev" />
              <Pagination.List />
              <Pagination.Control direction="next" />
            </div>
          </Pagination.Root>
        </div>
      )}
    </div>
  );
};

export default LectureSection;
