import { Lecture } from './lecture';

export interface LectureItem {
  id: number;
  section_id: number;
  title: string;
  type: 'video' | 'text';
  content_url?: string;
  duration?: string;
  order_num: number;
}

export interface LectureSection {
  id: number;
  lecture_id: number;
  title: string;
  order_num: number;
  lecture_items: LectureItem[];
}

export interface LectureDetail extends Lecture {
  lecture_sections: LectureSection[];
}

export interface LectureDBSection {
  id: number;
  lecture_id: number;
  title: string;
  order_num: number;
  lecture_items: LectureDBItem[];
}

export interface LectureDBItem {
  id: number;
  section_id: number;
  title: string;
  type: 'video' | 'text';
  content_url: string;
  duration: string;
  order_num: number;
}

// 강의 등록 폼
export interface LectureFormData {
  title: string;
  thumbnail_url?: string;
  category: string;
  instructor: string;
  depth: '입문' | '초급' | '중급' | '고급';
  keyword: string;
  group_type: '온라인' | '오프라인';
  is_public: boolean;
  price: number;
  is_free: boolean;
}

export interface LectureSectionFormData {
  title: string;
  orderNum: number;
  items: LectureItemFormData[];
}

export interface LectureItemFormData {
  title: string;
  type: 'video' | 'text';
  content_url?: string;
  duration?: string;
  orderNum: number;
}

export const CATEGORY_OPTIONS = [
  { value: '인문학', label: '인문학' },
  { value: '철학', label: '철학' },
  { value: '심리학', label: '심리학' },
  { value: '경제학', label: '경제학' },
  { value: '자기계발', label: '자기계발' },
  { value: '리더십', label: '리더십' }
] as const;

export const DEPTH_OPTIONS = [
  { value: '입문', label: '입문' },
  { value: '초급', label: '초급' },
  { value: '중급', label: '중급' },
  { value: '고급', label: '고급' }
] as const;

export const GROUP_TYPE_OPTIONS = [
  { value: '온라인', label: '온라인' },
  { value: '오프라인', label: '오프라인' }
] as const;

// 폼 제출 시 반환되는 데이터 타입
export interface LectureFormResult {
  lecture: LectureFormData;
  sections: LectureSectionFormData[];
}

// 폼 유효성 검사를 위한 타입
export type LectureFormError = {
  [K in keyof LectureFormData]?: string;
} & {
  sections?: string;
  general?: string;
}