import Card from '../common/Card';
import KeywordSelector from './KeywordSelector';
import Dropdown from '../common/Dropdown';
import Pagination from '../common/Pagination';
import Filter from './Filter';
import { lectures } from '@/dummy/lectureData';

const LectureSection = () => {
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
        {lectures.map((lecture) => (
          <Card
            id={lecture.id}
            key={lecture.id}
            title={lecture.title}
            instructor={lecture.instructor}
            href={`/lecture/${lecture.id}`}
            thumbnailUrl={lecture.thumbnailUrl}
            level={lecture.level}
            keyword={lecture.keyword}
            likes={lecture.likes}
            students={lecture.students}
          />
        ))}
      </div>
      <Pagination />
    </div>
  );
};

export default LectureSection;
