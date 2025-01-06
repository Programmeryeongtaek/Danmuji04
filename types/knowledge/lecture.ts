export interface Lecture {
  id: number;
  title: string;
  instructor: string;
  thumbnailUrl: string;
  depth: string;
  category: string;
  keyword: string;
  likes: number; 
  students: number;
  group: string;
  href: string;
}

export interface CategoryProps {
  selectedCategory: string;
  onCategoryClick: (category: string) => void;
}

export interface LectureSectionProps {
  selectedCategory: string;
}

export interface FilterState {
  depth: string[];
  fields: string[];
  hasGroup: boolean;
}

export interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void
}

export interface FilterChangeProps {
  onApply: (filters: FilterState) => void
}