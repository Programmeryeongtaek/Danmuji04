'use client';

import Card from '../common/Card';
import KeywordSelector from './KeywordSelector';
import Dropdown from '../common/Dropdown';
import Pagination from '../common/Pagination';
import Filter from './Filter';
import { lectures } from '@/dummy/lectureData';
import { FilterState, LectureSectionProps } from '@/types/knowledge/lecture';
import { useState } from 'react';

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

  const filteredLectures = lectures.filter((lecture) => {
    if (selectedCategory === 'search') return false;

    if (
      selectedCategory !== 'all' &&
      lecture.category !== categoryLabelMap.get(selectedCategory)
    ) {
      return false;
    }

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

    if (activeFilters.hasGroup && !lecture.group) {
      return false;
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
