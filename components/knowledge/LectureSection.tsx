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
import { lectures } from '@/dummy/lectureData';
import { useSearchParams } from 'next/navigation';
import {
  fetchLectures,
  fetchLecturesByCategory,
  searchLectures,
} from '@/utils/supabase/client';

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
  const [lectureList, setLectureList] = useState<Lecture[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    depth: [],
    fields: [],
    hasGroup: false,
  });

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
    if (activeFilters.hasGroup && lecture.groupType !== '오프라인') {
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
            <Card key={lecture.id} {...lecture} />
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
