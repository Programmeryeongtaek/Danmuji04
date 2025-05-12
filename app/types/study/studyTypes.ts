// 스터디 북마크 타입 정의
export interface StudyBookmark {
  id: string;
  study_id: string;
  user_id: string;
  notes?: string;
  importance: number;
  created_at: string;
}