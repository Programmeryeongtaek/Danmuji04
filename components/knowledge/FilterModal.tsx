import { FilterModalProps, FilterState } from '@/app/types/knowledge/lecture';
import Modal from '../common/Modal';
import { useEffect, useState } from 'react';
import Button from '../common/Button/Button';
import { RefreshCw } from 'lucide-react';
import { useAtom, useAtomValue } from 'jotai';
import {
  resetFiltersAtom,
  searchFilterAtom,
  updateFiltersAtom,
} from '@/store/knowledge/searchFilterAtom';

const FilterModal = ({ isOpen, onClose }: FilterModalProps) => {
  const searchFilter = useAtomValue(searchFilterAtom);
  const currentFilters = searchFilter.filters;

  const [, updateFilters] = useAtom(updateFiltersAtom);
  const [, resetFilters] = useAtom(resetFiltersAtom);

  // 임시 저장 (적용 버튼 누리기 전까지)
  const [tempFilters, setTempFilters] = useState<FilterState>({
    depth: [],
    fields: [],
    hasGroup: false,
  });

  const lectureDepth = ['입문', '초급', '중급 이상'];
  const fields = ['인문학', '철학', '심리학', '경제학', '자기계발', '리더십'];

  // 모덜이 열릴 때 현재 전역상태를 임시상태로 복사
  useEffect(() => {
    if (isOpen) {
      setTempFilters({
        depth: [...currentFilters.depth],
        fields: [...currentFilters.fields],
        hasGroup: currentFilters.hasGroup,
      });
    }
  }, [isOpen, currentFilters]);

  const handleDepthCheck = (depth: string) => {
    setTempFilters((prev) => ({
      ...prev,
      depth: prev.depth.includes(depth)
        ? prev.depth.filter((d) => d !== depth)
        : [...prev.depth, depth],
    }));
  };

  const handleFieldCheck = (field: string) => {
    setTempFilters((prev) => ({
      ...prev,
      fields: prev.fields.includes(field)
        ? prev.fields.filter((f) => f !== field)
        : [...prev.fields, field],
    }));
  };

  const handleGroupToggle = () => {
    setTempFilters((prev) => ({
      ...prev,
      hasGroup: !prev.hasGroup,
    }));
  };

  // 초기화 (전역사태로 함께 초기화)
  const handleReset = () => {
    setTempFilters({
      depth: [],
      fields: [],
      hasGroup: false,
    });
    resetFilters(); // 전역상태도 초기화
    onClose();
  };

  // 적용 (임시상태를 전역상태로 업데이트)
  const handleApply = () => {
    updateFilters(tempFilters);
    onClose();
  };

  return (
    <Modal.Root isOpen={isOpen} onClose={onClose}>
      <Modal.CloseButton />
      <Modal.Content>
        <div>
          <h2 className="text-xl font-bold">필터 선택</h2>

          <div className="mb-4 flex w-full gap-2 overflow-x-auto whitespace-nowrap border-b pb-2"></div>

          {/* 깊이 섹션 */}
          <section className="mb-6">
            <h3 className="mb-3 font-medium text-gray-800">깊이</h3>
            <div className="flex flex-wrap gap-2">
              {lectureDepth.map((depth) => (
                <label
                  key={depth}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
                    tempFilters.depth.includes(depth)
                      ? 'bg-gradient-to-r from-gold-start to-gold-end text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tempFilters.depth.includes(depth)}
                    onChange={() => handleDepthCheck(depth)}
                    className="sr-only"
                  />
                  {depth}
                </label>
              ))}
            </div>
          </section>

          {/* 분야 섹션 */}
          <section className="mb-6">
            <h3 className="mb-3 font-medium text-gray-800">분야</h3>
            <div className="flex flex-wrap gap-2">
              {fields.map((field) => (
                <label
                  key={field}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
                    tempFilters.fields.includes(field)
                      ? 'bg-gradient-to-r from-gold-start to-gold-end text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tempFilters.fields.includes(field)}
                    onChange={() => handleFieldCheck(field)}
                    className="sr-only"
                  />
                  {field}
                </label>
              ))}
            </div>
          </section>

          {/* 모임 형태 섹션 */}
          <section className="mb-4">
            <h3 className="mb-3 font-medium text-gray-800">모임 형태</h3>
            <label className="relative flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <span className="text-sm">오프라인 모임만 보기</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={tempFilters.hasGroup}
                  onChange={handleGroupToggle}
                  className="peer sr-only"
                />
                <div className="h-5 w-10 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-gold-start peer-checked:after:translate-x-5"></div>
              </div>
            </label>
          </section>

          {/* 하단 버튼 */}
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span>초기화</span>
            </button>
            <Button onClick={handleApply} className="px-6">
              적용
            </Button>
          </div>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default FilterModal;
