import { useState } from 'react';
import { DropdownRootProps, SortOption } from './Type';
import { DropdownContext } from './Context';

export default function Root({ children, onSort }: DropdownRootProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SortOption>('latest');

  const toggle = () => setIsOpen(!isOpen);

  const select = (option: SortOption) => {
    setSelectedOption(option);
    onSort(option);
    setIsOpen(false);
  };

  return (
    <DropdownContext.Provider
      value={{ isOpen, selectedOption, toggle, select }}
    >
      <div className="relatives">{children}</div>
    </DropdownContext.Provider>
  );
}
