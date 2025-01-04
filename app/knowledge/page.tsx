import Dropdown from '@/components/common/Dropdown';
import Pagination from '@/components/common/Pagination';
import Category from '@/components/knowledge/Category';
import Filter from '@/components/knowledge/Filter';
import KeywordSelector from '@/components/knowledge/KeywordSelector';

const KnowledgePage = () => {
  return (
    <div>
      <Category />
      <div className="flex justify-between">
        <div className="flex">
          <KeywordSelector />
          <Filter />
        </div>
        <Dropdown />
      </div>
      <Pagination />
    </div>
  );
};

export default KnowledgePage;
