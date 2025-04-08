'use client';

import Card from '../common/Card';
import KeywordSelector from './KeywordSelector';
import Pagination from '../common/Pagination';
import Filter from './Filter';
import {
  FilterState,
  Lecture,
  LectureSectionProps,
} from '@/types/knowledge/lecture';
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

const LectureSection = ({
  selectedCategory,
  searchQuery = '',
}: ExtendedLectureSectionProps) => {
  const searchParams = useSearchParams();
  const querySearchTerm = searchParams.get('q')?.toLowerCase() || '';
  const effectiveSearchQuery = searchQuery || querySearchTerm;

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
      } catch (error) {
        console.error('Failed to fetch lectures:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLectures();
  }, [selectedCategory, effectiveSearchQuery]);

  const onApply = (newFilters: FilterState) => {
    setActiveFilters(newFilters);
  };

  useEffect(() => {
    if (selectedCategory !== 'search') {
      setActiveFilters({
        depth: [],
        fields: [],
        hasGroup: false,
      });
    }
  }, [selectedCategory]);

  const filteredLectures = lectureList.filter((lecture) => {
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

  if (isLoading || bookmarksLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="flex flex-col">
      {effectiveSearchQuery && (
        <div>
          <h2>
            {effectiveSearchQuery} 검색 결과 ({filteredLectures.length}개)
          </h2>
        </div>
      )}
      <div className="flex justify-between">
        <div className="flex">
          <KeywordSelector />
          <Filter onApply={onApply} />
        </div>
        <Dropdown.Root onSort={handleSort}>
          <Dropdown.Trigger />
          <Dropdown.Context />
        </Dropdown.Root>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {/* 로딩 중에는 이전 데이터 표시, 없으면 로딩 표시 */}
        {isLoading ? (
          prevLectures.length > 0 ? (
            prevLectures.map((lecture) => (
              <div key={lecture.id} className="opacity-50">
                <Card
                  {...lecture}
                  isBookmarked={bookmarkedLectures.includes(lecture.id)}
                  onToggleBookmark={handleToggleBookmark}
                />
              </div>
            ))
          ) : (
            <div>로딩 중...</div>
          )
        ) : filteredLectures.length > 0 ? (
          filteredLectures.map((lecture) => (
            <Card
              key={lecture.id}
              {...lecture}
              isBookmarked={bookmarkedLectures.includes(lecture.id)}
              onToggleBookmark={handleToggleBookmark}
            />
          ))
        ) : (
          <div>검색 결과가 없습니다.</div>
        )}
      </div>

      <Pagination />
    </div>
  );
};

export default LectureSection;
