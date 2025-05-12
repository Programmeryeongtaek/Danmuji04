// 도서 정보 타입 정의
export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string;
  isbn: string;
  publisher: string;
  publication_date: string;
  recommendation_count: number;
  created_by: string | null;
  created_at: string;
}

// 도서 폼 데이터 타입 정의
export interface BookFormData {
  title: string;
  author: string;
  description: string;
  isbn: string;
  publisher: string;
  publication_date: string;
  cover_url?: string | null;
}

// 도서와 관련 스터디 수를 포함한 타입
export interface BookWithStudyCount extends Book {
  study_count: number;
}