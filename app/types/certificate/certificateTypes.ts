// 수료증 인터페이스 정의
export interface Certificate {
  id: number;
  user_id: string;
  category: string;
  issued_at: string;
  updated_at: string | null;
  is_outdated: boolean;
  completed_courses: string[];
}

// 알림 관련 데이터 타입 정의
export interface CourseAddedData {
  category: string;
  course_id: string;
  course_title: string;
}

export interface CertificateData {
  category: string;
}


// 알림 타입에 따른 데이터 타입 정의
export type NotificationRelatedData = CourseAddedData | CertificateData;


// 알림 인터페이스
export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'course_added' | 'certificate_issued' | 'certificate_updated';
  related_data: NotificationRelatedData;
  read: boolean;
  created_at: string;
  pending_delete?: boolean;
  delete_at?: string | null;
}