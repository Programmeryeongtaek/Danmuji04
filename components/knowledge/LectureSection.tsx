import Card from '../common/Card';
import KeywordSelector from './KeywordSelector';
import Dropdown from '../common/Dropdown';
import Pagination from '../common/Pagination';
import Filter from './Filter';
import { lectures } from '@/dummy/lectureData';
import { LectureSectionProps } from '@/types/knowledge/lecture';

const LectureSection = ({ selectedCategory }: LectureSectionProps) => {
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
