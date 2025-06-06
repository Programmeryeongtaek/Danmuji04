'use client';

import { FilterOptions } from '@/app/types/community/communityType';
import { Filter } from 'lucide-react';
import { COMMUNITY_CATEGORIES, PERIOD_OPTIONS, SORT_OPTIONS } from './Const';
import Modal from '../common/Modal';
import { useState } from 'react';

interface SearchFilterSectionProps {
  showFilters: boolean;
  filters: FilterOptions;
  onToggleFilters: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
}

export default function SearchFilterSection({
  filters,
  onApplyFilters,
}: SearchFilterSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterOptions>(filters);

  const handleOpenModal = () => {
    setTempFilters(filters); // 현재 필터 상태를 임시 필터에 복사
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const updateTempFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    setTempFilters({ ...tempFilters, [key]: value });
  };

  const handleApplyFilters = () => {
    onApplyFilters(tempFilters);
    setIsModalOpen(false);
  };

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      category: 'all',
      period: 'all',
      sort: 'recent',
    };
    setTempFilters(defaultFilters);
  };

  return (
    <>
      {/* 필터 버튼 */}
      <button
        onClick={handleOpenModal}
        className="flex items-center gap-1 rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50"
      >
        <Filter className="h-5 w-5" />
        <span className="hidden sm:inline">필터</span>
      </button>

      {/* 필터 모달 */}
      <Modal.Root isOpen={isModalOpen} onClose={handleCloseModal}>
        <Modal.CloseButton />
        <Modal.Content>
          <div className="mobile:mb-3 tablet:mb-6">
            <h2 className="text-center text-xl font-bold">검색 필터</h2>
          </div>

          <div className="mobile:space-y-4 tablet:space-y-6">
            {/* 카테고리 필터 */}
            <div>
              <h3 className="mb-3 text-base font-medium text-gray-700">
                카테고리
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {COMMUNITY_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => updateTempFilter('category', category.id)}
                    className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                      tempFilters.category === category.id
                        ? 'bg-gold-start text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 기간 필터 */}
            <div>
              <h3 className="mb-3 text-base font-medium text-gray-700">기간</h3>
              <div className="grid grid-cols-4 gap-2">
                {PERIOD_OPTIONS.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => updateTempFilter('period', period.value)}
                    className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                      tempFilters.period === period.value
                        ? 'bg-gold-start text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 정렬 필터 */}
            <div>
              <h3 className="mb-3 text-base font-medium text-gray-700">정렬</h3>
              <div className="grid grid-cols-2 gap-2">
                {SORT_OPTIONS.map((sort) => (
                  <button
                    key={sort.value}
                    onClick={() => updateTempFilter('sort', sort.value)}
                    className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                      tempFilters.sort === sort.value
                        ? 'bg-gold-start text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 버튼 그룹 */}
          <div className="mt-6 flex justify-end">
            <div className="flex gap-3">
              <button
                onClick={resetFilters}
                className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                초기화
              </button>

              <button
                onClick={handleApplyFilters}
                className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-6 py-2 text-white transition-opacity hover:opacity-90"
              >
                적용
              </button>
            </div>
          </div>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
