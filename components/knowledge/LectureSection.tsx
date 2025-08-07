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
  searchFilterAtom,
  updateKeywordsAtom,
  updateSortOptionAtom,
} from '@/store/knowledge/searchFilterAtom';
import { useLectureList, useLectureSearch } from '@/hooks/api/useLectureApi';
import { X } from 'lucide-react';

interface ExtendedLectureSectionProps extends LectureSectionProps {
  searchQuery?: string;
}

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

  const [, updateSortOption] = useAtom(updateSortOptionAtom);
  const [, updateKeywords] = useAtom(updateKeywordsAtom);

  // TanStack Query 훅들
  const {
    data: categoryLectures,
    isLoading: categoryLoading,
    error: categoryError,
  } = useLectureList(selectedCategory);

  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
  } = useLectureSearch(effectiveSearchQuery, activeFilters);

  const { handleToggleBookmark, isBookmarked } = useBookmarks();

  const [lectureList, setLectureList] = useState<Lecture[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // 로딩 상태와 데이터 계산 - 조건 수정
  const shouldUseSearch = Boolean(
    effectiveSearchQuery && effectiveSearchQuery.trim() !== ''
  );
  const isLoading = shouldUseSearch ? searchLoading : categoryLoading;
  const error = shouldUseSearch ? searchError : categoryError;
  const lectures = shouldUseSearch ? searchResults : categoryLectures;

  // 강의 목록 업데이트 - 필터링 로직 개선
  useEffect(() => {
    if (!lectures) {
      setLectureList([]);
      return;
    }

    // 기본 필터링된 강의 목록
    let filteredLectures = [...lectures];

    // 카테고리별 조회인 경우 추가 필터 적용
    if (!shouldUseSearch) {
      // 깊이 필터 적용
      if (activeFilters.depth?.length > 0) {
        filteredLectures = filteredLectures.filter((lecture) => {
          const lectureDepth = lecture.depth || '';
          return activeFilters.depth.some((depth) => {
            // "중급 이상"과 "중급" 매핑 처리
            if (depth === '중급 이상' && lectureDepth === '중급') return true;
            return lectureDepth === depth;
          });
        });
      }

      // 분야 필터 적용 - 수정된 로직
      if (activeFilters.fields?.length > 0) {
        filteredLectures = filteredLectures.filter((lecture) => {
          const lectureCategory = lecture.category || '';
          return activeFilters.fields.includes(lectureCategory);
        });
      }

      // 오프라인 모임 필터 적용
      if (activeFilters.hasGroup) {
        filteredLectures = filteredLectures.filter(
          (lecture) => lecture.group_type !== 'online'
        );
      }
    }

    // 키워드 필터링
    if (selectedKeywords.length > 0) {
      filteredLectures = filteredLectures.filter((lecture) =>
        selectedKeywords.some(
          (keyword) =>
            lecture.keyword?.toLowerCase().includes(keyword.toLowerCase()) ||
            lecture.title.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    // 정렬 적용
    const sortedLectures = [...filteredLectures].sort((a, b) => {
      switch (sortOption) {
        case 'latest':
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        case 'popular':
          return (b.students || 0) - (a.students || 0);
        case 'likes':
          return (b.likes || 0) - (a.likes || 0);
        default:
          return 0;
      }
    });

    setLectureList(sortedLectures);
    setCurrentPage(1); // 새 데이터 로드 시 첫 페이지로
  }, [lectures, selectedKeywords, sortOption, activeFilters, shouldUseSearch]);

  // 정렬 옵션 변경 핸들러
  const handleSortChange = (option: SortOption) => {
    updateSortOption(option);
  };

  // 키워드 제거 핸들러
  const removeKeyword = (keywordToRemove: string) => {
    const newKeywords = selectedKeywords.filter((k) => k !== keywordToRemove);
    updateKeywords(newKeywords);
  };

  // 페이지네이션 처리
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLectures = lectureList.slice(startIndex, endIndex);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 에러 처리
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-500">
            강의를 불러오는 중 오류가 발생했습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-gold-start px-4 py-2 text-white hover:bg-gold-end"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4">
      {/* 검색 결과 헤더 */}
      {effectiveSearchQuery && (
        <div className="mb-4">
          <h2 className="text-lg font-medium">
            {effectiveSearchQuery} 검색 결과 ({lectureList.length}개)
          </h2>
        </div>
      )}

      {/* 필터 및 정렬 영역 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Filter />
          <KeywordSelector />

          {/* 활성화된 키워드 표시 */}
          {selectedKeywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedKeywords.map((keyword) => (
                <div
                  key={keyword}
                  className="flex items-center gap-1 rounded-full border border-gold-start bg-light px-3 py-1 text-sm font-medium text-black"
                >
                  <span>{keyword}</span>
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="rounded-full p-0.5 hover:bg-gold-start/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-40 hover:bg-light">
          <Dropdown.Root onSort={handleSortChange}>
            <Dropdown.Trigger />
            <Dropdown.Context />
          </Dropdown.Root>
        </div>
      </div>

      {/* 총 결과 수 표시 */}
      <div className="mb-4 text-sm text-gray-600">
        총 {lectureList.length}개의 강의
      </div>

      {/* 강의 카드 그리드 */}
      <div className="relative z-10 grid gap-4 mobile:mb-20 mobile:grid-cols-1 sm:grid-cols-2 tablet:grid-cols-3 laptop:grid-cols-4">
        {isLoading ? (
          // 로딩 중 스켈레톤 UI
          Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="mb-2 h-64 rounded-lg bg-gray-200"></div>
              <div className="mb-1 h-4 rounded bg-gray-200"></div>
              <div className="h-4 w-3/4 rounded bg-gray-200"></div>
            </div>
          ))
        ) : paginatedLectures.length > 0 ? (
          paginatedLectures.map((lecture) => (
            <Card
              key={lecture.id}
              {...lecture}
              isBookmarked={isBookmarked(lecture.id)}
              onToggleBookmark={() => handleToggleBookmark(lecture.id)}
            />
          ))
        ) : (
          <div className="col-span-full flex justify-center py-8">
            <div className="text-center">
              <p className="mb-2 text-lg font-medium text-gray-700">
                {effectiveSearchQuery
                  ? '검색 결과가 없습니다.'
                  : '강의가 없습니다.'}
              </p>
              <p className="text-sm text-gray-500">
                {effectiveSearchQuery
                  ? '다른 키워드나 필터를 사용해 보세요.'
                  : '다른 카테고리를 확인해보세요.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {lectureList.length > ITEMS_PER_PAGE && (
        <div className="mt-8 flex justify-center">
          <Pagination.Root
            currentPage={currentPage}
            totalItems={lectureList.length}
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
