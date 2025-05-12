// 코스 기본 정보 타입 정의
export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  instructor_id: string;
  instructor_name: string;
  created_at: string;
  updated_at: string | null;
}

// 코스 폼 데이터 타입 정의
export interface CourseFormData {
  title: string;
  description: string;
  category: string;
}

// 코스 아이템 타입 정의
export interface CourseItem {
  id: string;
  course_id: string;
  title: string;
  description: string;
  keywords: string[];
  youtube_id: string;
  order_num: number;
  created_at: string;
  updated_at: string | null;
}

// 코스 아이템 폼 데이터 타입 정의
export interface CourseItemFormData {
  title: string;
  description: string;
  keywords: string[] | string;
  youtube_id: string;
}

// 코스 작성 내용 타입 정의
export interface CourseWriting {
  id: string;
  user_id: string;
  user_name: string;
  course_id: string;
  item_id: string;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// 작성 폼 데이터 타입 정의
export interface WritingFormData {
  content: string;
  is_public: boolean;
}