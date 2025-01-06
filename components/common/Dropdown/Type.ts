import { ReactNode } from 'react';

export type SortOption = 'latest' | 'students' | 'likes';

export interface DropdownContextValue {
  isOpen: boolean;
  selectedOption: SortOption;
  toggle: () => void;
  select: (option: SortOption) => void;
}

export interface DropdownRootProps {
  children: ReactNode;
  onSort: (option: SortOption) => void;
}