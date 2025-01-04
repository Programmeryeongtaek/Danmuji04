import Card from '../common/Card';
import KeywordSelector from './KeywordSelector';
import Dropdown from '../common/Dropdown';
import Pagination from '../common/Pagination';
import Filter from './Filter';

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
      <div>
        <Card />
      </div>
      <Pagination />
    </div>
  );
};

export default LectureSection;
