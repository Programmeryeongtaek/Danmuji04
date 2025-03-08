import { CourseCategory } from './categories';

export interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory | string; // string도 허용하여 유연성 확보
  thumbnail_url?: string;
  instructor_id: string;
  instructor_name: string;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
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
  section_id: string;
  title: string;
  description?: string;
  type: 'video' | 'text';
  content_url?: string;
  duration?: string;
  order_num: number;
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
  sections: (CourseSection & {
    items: CourseItem[];
  })[];
}

export interface CourseFormData {
  title: string;
  description: string;
  category: CourseCategory | string;
  thumbnail_url?: string;
  is_premium: boolean;
}

export interface CourseSectionFormData {
  title: string;
  description?: string;
  order_num: number;
  items: CourseItemFormData[];
}

export interface CourseItemFormData {
  title: string;
  description?: string;
  type: 'video' | 'text';
  content_url?: string;
  duration?: string;
  order_num: number;
}