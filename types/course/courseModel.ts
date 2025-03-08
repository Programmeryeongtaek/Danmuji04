import { CourseCategory } from './categories';

export interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  instructor_id: string;
  instructor_name: string;
  created_at: string;
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_num: number;
  created_at: string;
  updated_at: string;
}

export interface CourseItem {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  youtube_id: string;
  order_num: number;
  created_at: string;
}

export interface CourseWriting {
  id: string;
  user_id: string;
  user_name: string;
  course_id: string;
  item_id: string; // 어떤 강의 아이템에 대한 글인지
  content: string;
  is_public: boolean; // 공개 여부
  created_at: string;
  updated_at: string;
}

export interface CourseProgress {
  course_id: string;
  user_id: string;
  item_id: string;
  completed: boolean;
  last_accessed: string;
}

export interface CourseWithSections extends Course {
  sections: {
    id: string;
    title: string;
    items: CourseItem[];
  }[];
}

export interface CourseFormData {
  title: string;
  description: string;
  category: CourseCategory;
}

export interface CourseSectionFormData {
  title: string;
  description?: string;
  order_num: number;
  items: CourseItemFormData[];
}

// 코스 아이템(강의) 생성 폼 데이터 타입
export interface CourseItemFormData {
  title: string;
  description?: string;
  keywords?: string;
  youtube_id: string;
}

// 글쓰기 폼 데이터 타입
export interface WritingFormData {
  content: string;
  is_public: boolean;
}