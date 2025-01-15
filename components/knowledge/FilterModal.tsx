import { FilterModalProps, FilterState } from '@/types/knowledge/lecture';
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
      <div className="fixed inset-0 flex flex-col bg-light p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-lg font-semibold">필터</h2>
          <Modal.CloseButton className="text-gray-500" />
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex flex-col">
          <section className="">
            <h3>깊이</h3>
            <div className="flex flex-col justify-start">
              {lectureDepth.map((depth) => (
                <label key={depth}>
                  <input
                    type="checkbox"
                    checked={filters.depth.includes(depth)}
                    onChange={() => handleDepthCheck(depth)}
                  />
                  <span>{depth}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3>분야</h3>
            <div className="flex flex-wrap gap-x-2">
              {fields.map((fields) => (
                <label key={fields}>
                  <input
                    type="checkbox"
                    checked={filters.fields.includes(fields)}
                    onChange={() => handleFieldCheck(fields)}
                  />
                  <span>{fields}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3>모임 형태</h3>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={filters.hasGroup}
                onChange={handleGroupToggle}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-gold-start peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              <span>오프라인</span>
            </label>
          </section>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-center">
          {/* TODO: reset 버튼 확장 */}
          <div className="flex">
            <RefreshCw />
            <button onClick={handleReset}>초기화</button>
          </div>
          <Button onClick={handleApply}>완료</Button>
        </div>
      </div>
    </Modal.Root>
  );
};

export default FilterModal;
