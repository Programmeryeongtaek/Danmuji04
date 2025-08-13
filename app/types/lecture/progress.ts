export interface LectureProgress {
  lectureId: number;
  userId: string;
  completedItems: number[];
  totalItems: number;
  progressPercentage: number;
  lastWatchedAt: string;
  lastWatchedItemId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LectureProgressUpdate {
  completedItems?: number[];
  totalItems?: number;
  progressPercentage?: number;
  lastWatchedAt?: string;
  lastWatchedItemId?: number | null;
}

export interface LectureProgressResponse {
  lecture_id: number;
  user_id: string;
  completed_items: number[];
  total_items: number;
  progress_percentage: number;
  last_watched_at: string;
  last_watched_item_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface LectureProgressStats {
  lectureCount: number;
  completedLectures: number;
  totalItems: number;
  completedItems: number;
  overallPercentage: number;
}

export interface MarkItemCompletedParams {
  lectureId: number;
  itemId: number;
}

export interface UpdateLastWatchedParams {
  lectureId: number;
  itemId: number;
}

export interface ResetProgressParams {
  lectureId: number;
}