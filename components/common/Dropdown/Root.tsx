import { useEffect, useRef, useState } from 'react';
import { DropdownRootProps, SortOption } from './Type';
import { DropdownContext } from './Context';

export default function Root({ children, onSort }: DropdownRootProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SortOption>('latest');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggle = () => setIsOpen(!isOpen);

  const select = (option: SortOption) => {
    setSelectedOption(option);
    onSort(option);
    setIsOpen(false);
  };

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider
      value={{ isOpen, selectedOption, toggle, select }}
    >
      <div ref={dropdownRef} className="relative z-30">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}
