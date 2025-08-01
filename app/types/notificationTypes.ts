// 알림 관련 데이터 타입들
export interface CourseAddedData {
  category: string;
  course_id: string;
  course_title: string;
}

export interface CertificateData {
  category: string;
}

// 알림 타입에 따른 데이터 타입 정의
export type NotificationRelatedData =
  | CourseAddedData
  | CertificateData
  | Record<string, unknown>;

// 기본 알림 인터페이스
export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'course_added' | 'certificate_issued' | 'certificate_updated' | string;
  related_data: NotificationRelatedData;
  read: boolean;
  created_at: string;
  pending_delete?: boolean;
  delete_at?: string | null;
}

// 알림 상태 인터페이스
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isRealTimeConnected: boolean;
  lastFetched: number | null;
}

// 알림 액션 타입들
export interface NotificationActions {
  initialize: () => Promise<void>;
  startRealtimeSubscription: () => Promise<(() => void) | null>;
  markNotificationAsRead: (id: number) => Promise<boolean>;
  markAllNotificationsAsRead: () => Promise<boolean>;
  deleteNotification: (id: number) => Promise<boolean>;
  markNotificationForDeletion: (id: number, delayMinutes?: number) => Promise<boolean>;
  cancelNotificationDeletion: (id: number) => Promise<boolean>;
  refresh: () => Promise<void>;
}

// 알림 컨텍스트 타입 (선택적 사용)
export interface NotificationContextType extends NotificationState, NotificationActions {}

// 알림 훅 반환 타입
export interface UseNotificationsReturn extends NotificationState, NotificationActions {}