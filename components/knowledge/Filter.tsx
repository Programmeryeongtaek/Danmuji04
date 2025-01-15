import { useState } from 'react';
import FilterModal from './FilterModal';
import { FilterChangeProps, FilterState } from '@/types/knowledge/lecture';

const Filter = ({ onApply }: FilterChangeProps) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleApplyFilters = (filters: FilterState) => {
    onApply(filters);
  };

  return (
    <>
      <button
        onClick={() => setIsFilterModalOpen(true)}
        className="rounded-lg border border-gray-300 bg-gradient-to-r from-gold-start to-gold-end px-2 py-1"
      >
        Filter
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
