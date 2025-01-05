export interface Lecture {
  id: number;
  title: string;
  instructor: string;
  href: string;
  thumbnailUrl: string;
  level: string;
  keyword: string;
  likes: number;
  students: number;
}

export interface CategoryProps {
  selectedCategory: string;
  onCategoryClick: (category: string) => void;
}

export interface LectureSectionProps {
  selectedCategory: string;
}