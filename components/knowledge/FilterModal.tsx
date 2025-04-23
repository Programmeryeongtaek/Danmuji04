import { FilterModalProps, FilterState } from '@/app/types/knowledge/lecture';
import Modal from '../common/Modal';
import { useState } from 'react';
import Button from '../common/Button/Button';
import { RefreshCw } from 'lucide-react';

const FilterModal = ({ isOpen, onClose, onApply }: FilterModalProps) => {
  const [filters, setFilters] = useState<FilterState>({
    depth: [],
    fields: [],
    hasGroup: false,
  });

  const lectureDepth = ['입문', '초급', '중급 이상'];
  const fields = ['인문학', '철학', '심리학', '경제학', '자기계발', '리더십'];

  const handleDepthCheck = (depth: string) => {
    setFilters((prev) => ({
      ...prev,
      depth: prev.depth.includes(depth)
        ? prev.depth.filter((d) => d !== depth)
        : [...prev.depth, depth],
    }));
  };

  const handleFieldCheck = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      fields: prev.fields.includes(field)
        ? prev.fields.filter((f) => f !== field)
        : [...prev.fields, field],
    }));
  };

  const handleGroupToggle = () => {
    setFilters((prev) => ({
      ...prev,
      hasGroup: !prev.hasGroup,
    }));
  };

  const handleReset = () => {
    setFilters({
      depth: [],
      fields: [],
      hasGroup: false,
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  return (
    <Modal.Root isOpen={isOpen} onClose={onClose}>
      <Modal.CloseButton className="absolute right-[70px] top-[180px]" />
      <Modal.Content>
        <div className="px-2 pb-6 pt-2">
          <h2 className="mb-4 text-xl font-bold">필터 선택</h2>

          <div className="mb-4 flex w-full gap-2 overflow-x-auto whitespace-nowrap border-b pb-2"></div>

          {/* 깊이 섹션 */}
          <section className="mb-6">
            <h3 className="mb-3 font-medium text-gray-800">깊이</h3>
            <div className="flex flex-wrap gap-2">
              {lectureDepth.map((depth) => (
                <label
                  key={depth}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
                    filters.depth.includes(depth)
                      ? 'bg-gradient-to-r from-gold-start to-gold-end text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={filters.depth.includes(depth)}
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
                    filters.fields.includes(field)
                      ? 'bg-gradient-to-r from-gold-start to-gold-end text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={filters.fields.includes(field)}
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
                  checked={filters.hasGroup}
                  onChange={handleGroupToggle}
                  className="peer sr-only"
                />
                <div className="h-5 w-10 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-gold-start peer-checked:after:translate-x-5"></div>
              </div>
            </label>
          </section>

          {/* 하단 버튼 */}
          <div className="mt-6 flex justify-between gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span>초기화</span>
            </button>
            <Button onClick={handleApply} className="px-6">
              적용하기
            </Button>
          </div>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default FilterModal;
