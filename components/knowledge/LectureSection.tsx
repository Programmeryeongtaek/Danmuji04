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

const LectureSection = ({ selectedCategory }: LectureSectionProps) => {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';
  const {
    bookmarkedLectures,
    handleToggleBookmark,
    isLoading: bookmarksLoading,
  } = useBookmarks();

  const [lectureList, setLectureList] = useState<Lecture[]>([]);
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
        setIsLoading(true);
        let data;

        if (selectedCategory === 'search' && searchQuery) {
          data = await searchLectures(searchQuery);
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
  }, [selectedCategory, searchQuery]);

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
      {searchQuery && (
        <div>
          <h2>
            {searchQuery} 검색 결과 ({filteredLectures.length}개)
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

      {filteredLectures.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-4">
          {filteredLectures.map((lecture) => (
            <Card
              key={lecture.id}
              {...lecture}
              isBookmarked={bookmarkedLectures.includes(lecture.id)}
              onToggleBookmark={handleToggleBookmark}
            />
          ))}
        </div>
      ) : (
        <div>검색 결과가 없습니다.</div>
      )}

      <Pagination />
    </div>
  );
};

export default LectureSection;
