'use client';

import Card from '../common/Card';
import KeywordSelector from './KeywordSelector';
import Filter from './Filter';
import {
  FilterState,
  Lecture,
  LectureSectionProps,
} from '@/app/types/knowledge/lecture';
import { useEffect, useState } from 'react';
import Dropdown from '../common/Dropdown/Dropdown';
import { SortOption } from '../common/Dropdown/Type';
import { useSearchParams } from 'next/navigation';
import {
  fetchLectures,
  fetchLecturesByCategory,
  searchLectures,
} from '@/utils/supabase/client';
import { useBookmarks } from '@/hooks/useBookmarks';
import Pagination from '../common/Pagination';

interface ExtendedLectureSectionProps extends LectureSectionProps {
  searchQuery?: string;
}

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

  // 키워드 필터링 파라미터 가져오기
  const keywordsParam = searchParams.get('keywords') || '';
  const selectedKeywords = keywordsParam ? keywordsParam.split(',') : [];

  const {
    bookmarkedLectures,
    handleToggleBookmark,
    isLoading: bookmarksLoading,
  } = useBookmarks();

  const [lectureList, setLectureList] = useState<Lecture[]>([]);
  const [prevLectures, setPrevLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    depth: [],
    fields: [],
    hasGroup: false,
  });

  // 페이지네이션 관련 상태
  const [currentPage, setCurrentPage] = useState(1);

  // 강의 데이터 가져오기
  useEffect(() => {
    const loadLectures = async () => {
      try {
        // 이전 데이터 유지
        if (lectureList.length > 0) {
          setPrevLectures(lectureList);
        }

        setIsLoading(true);
        let data;

        if (selectedCategory === 'search' && effectiveSearchQuery) {
          data = await searchLectures(effectiveSearchQuery);
        } else if (selectedCategory !== 'all') {
          const categoryLabel = categoryLabelMap.get(selectedCategory);
          data = await fetchLecturesByCategory(categoryLabel || '');
        } else {
          data = await fetchLectures();
        }

        setLectureList(data || []);
        // 카테고리나 검색어가 변경되면 페이지를 1로 리셋
        setCurrentPage(1);
      } catch (error) {
        console.error('Failed to fetch lectures:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLectures();
  }, [selectedCategory, effectiveSearchQuery]);

  // 필터 파라미터나 키워드가 변경될 때마다 페이지네이션 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [keywordsParam, activeFilters]);

  const onApply = (newFilters: FilterState) => {
    setActiveFilters(newFilters);
    setCurrentPage(1); // 필터 적용 시 첫 페이지로 이동
  };

  // 카테고리 변경 시 필터 초기화
  useEffect(() => {
    if (selectedCategory !== 'search') {
      setActiveFilters({
        depth: [],
        fields: [],
        hasGroup: false,
      });
    }
  }, [selectedCategory]);

  // 키워드가 강의 keyword 필드에 포함되어 있는지 확인하는 함수
  const hasMatchingKeyword = (
    lecture: Lecture,
    searchKeywords: string[]
  ): boolean => {
    if (!searchKeywords.length) return true; // 선택된 키워드가 없으면 모든 강의 표시
    if (!lecture.keyword) return false; // 강의에 키워드가 없으면 매칭되지 않음

    // 강의 키워드 문자열을 개별 키워드로 분리
    const lectureKeywords = lecture.keyword
      .split(',')
      .map((k) => k.trim().toLowerCase());

    // 선택된 키워드 중 하나라도 강의 키워드에 포함되어 있으면 true 반환
    return searchKeywords.some((searchKeyword) =>
      lectureKeywords.includes(searchKeyword.toLowerCase())
    );
  };

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

  const handleSort = async (option: SortOption) => {
    const sorted = [...lectureList].sort((a, b) => {
      switch (option) {
        case 'latest':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'students':
          return b.students - a.students;
        case 'likes':
          return b.likes - a.likes;
      }
    });
    setLectureList(sorted);
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
    // 페이지 상단으로 스크롤
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
          <Filter onApply={onApply} />
        </div>

        {/* 드롭다운 영역 - 더 높은 z-index 값 부여 */}
        <div className="relative z-40">
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

      {/* 강의 카드 그리드 - z-index를 낮게 설정 */}
      <div className="relative z-10 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* 로딩 중에는 이전 데이터 표시, 없으면 로딩 표시 */}
        {isLoading ? (
          prevLectures.length > 0 ? (
            prevLectures.slice(0, ITEMS_PER_PAGE).map((lecture) => (
              <div key={lecture.id} className="opacity-50">
                <Card
                  {...lecture}
                  isBookmarked={bookmarkedLectures.includes(lecture.id)}
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
              isBookmarked={bookmarkedLectures.includes(lecture.id)}
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
