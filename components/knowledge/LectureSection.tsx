'use client';

import Card from '../common/Card';
import KeywordSelector from './KeywordSelector';
import Dropdown from '../common/Dropdown';
import Pagination from '../common/Pagination';
import Filter from './Filter';
import { lectures } from '@/dummy/lectureData';
import { FilterState, LectureSectionProps } from '@/types/knowledge/lecture';
import { useEffect, useState } from 'react';

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
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    depth: [],
    fields: [],
    hasGroup: false,
  });

  const onApply = (newFilters: FilterState) => {
    setActiveFilters(newFilters);
  };

  // 카테고리 선택시, 필터 초기화
  useEffect(() => {
    setActiveFilters({
      depth: [],
      fields: [],
      hasGroup: false,
    });
  }, [selectedCategory]);

  const filteredLectures = lectures.filter((lecture) => {
    // 검색 카테고리 처리
    if (selectedCategory === 'search') return false;

    // 카테고리 필터링 ('전체'가 아닐 경우)
    if (selectedCategory !== 'all') {
      const categoryLabel = categoryLabelMap.get(selectedCategory);
      if (lecture.category !== categoryLabel) {
        return false;
      }
    }

    // 전체 카테고리일 때만 필터 적용
    if (selectedCategory === 'all') {
      // 깊이
      if (
        activeFilters.depth.length > 0 &&
        !activeFilters.depth.includes(lecture.depth)
      ) {
        return false;
      }

      // 분야
      if (
        activeFilters.fields.length > 0 &&
        !activeFilters.fields.includes(lecture.category)
      ) {
        return false;
      }

      // 모임
      if (activeFilters.hasGroup && !lecture.group) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="flex flex-col">
      <div className="flex justify-between">
        <div className="flex">
          <KeywordSelector />
          <Filter onApply={onApply} />
        </div>
        <Dropdown />
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {filteredLectures.map((lecture) => (
          <Card key={lecture.id} {...lecture} />
        ))}
      </div>
      <Pagination />
    </div>
  );
};

export default LectureSection;
