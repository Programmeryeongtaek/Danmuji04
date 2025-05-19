import { useState } from 'react';
import FilterModal from './FilterModal';
import { FilterChangeProps, FilterState } from '@/app/types/knowledge/lecture';

const Filter = ({ onApply }: FilterChangeProps) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleApplyFilters = (filters: FilterState) => {
    onApply(filters);
  };

  return (
    <>
      <button
        onClick={() => setIsFilterModalOpen(true)}
        className="rounded-lg border px-3 py-1 text-gray-700 hover:border-gold-start hover:bg-light hover:font-medium hover:text-black"
      >
        필터
      </button>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilters}
      />
    </>
  );
};

export default Filter;
