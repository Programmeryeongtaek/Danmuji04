'use client';

import Card from '../common/Card';
import KeywordSelector from './KeywordSelector';
import Dropdown from '../common/Dropdown';
import Pagination from '../common/Pagination';
import Filter from './Filter';
import { lectures } from '@/dummy/lectureData';
import { LectureSectionProps } from '@/types/knowledge/lecture';

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
  const filteredLectures = lectures.filter((lecture) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'search') return false;

    return lecture.keyword === categoryLabelMap.get(selectedCategory);
  });

  return (
    <div className="flex flex-col">
      <div className="flex justify-between">
        <div className="flex">
          <KeywordSelector />
          <Filter />
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
