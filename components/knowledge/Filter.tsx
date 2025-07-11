import { useState } from 'react';
import FilterModal from './FilterModal';
import { useAtomValue } from 'jotai';
import { hasActiveFiltersAtom } from '@/store/knowledge/searchFilterAtom';

const Filter = () => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // 전역상태에서 필터 활성화 여부 확인
  const hasActiveFilters = useAtomValue(hasActiveFiltersAtom);

  return (
    <>
      <button
        onClick={() => setIsFilterModalOpen(true)}
        className={`rounded-lg border px-3 py-1 transition-colors hover:border-gold-start hover:bg-light hover:font-medium hover:text-black ${
          hasActiveFilters
            ? 'border-gold-start bg-light font-medium text-black'
            : 'text-gray-700'
        }`}
      >
        필터
      </button>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </>
  );
};

export default Filter;
