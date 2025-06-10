// 기본 프로필 타입
export interface Profile {
  id: string;
  name?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
}

// 게시글 기본 타입
export interface Post {
  id: number;
  title: string;
  content?: string;
  category: string;
  created_at: string;
  updated_at?: string;
  tags: string[];
  views: number;
  likes_count: number;
  comments_count: number;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  is_bookmarked?: boolean;
  is_liked?: boolean;
}

// 북마크된 게시글 타입 (북마크 전용 필드 추가)
export interface BookmarkedPost extends Post {
  bookmark_created_at: string;
  importance: number;
  memo: string;
}

// 댓글 타입
export interface Comment {
  id: number;
  post_id: number;
  author_id: string;
  content: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string | null;
  likes_count?: number;
  is_liked?: boolean;
  replies?: Comment[];
}

// 필터 옵션 타입
export interface FilterOptions {
  category?: string;
  period?: 'all' | 'day' | 'week' | 'month' | 'year';
  sort?: 'recent' | 'likes';
  tag?: string;
}

// 댓글 편집 상태 타입
export interface EditingComment {
  id: number;
  content: string;
  isReply: boolean;
}

// 답글 작성 상태 타입
export interface NewReply {
  commentId: number | null;
  content: string;
}

// 좋아요 상태 타입
export interface LikeStatus {
  isLiked: boolean;
  likesCount: number;
}

// 커뮤니티 카테고리 타입
export type CommunityCategory = 'all' | 'notice' | 'chats' | 'faq';

// 카테고리 정보 인터페이스
export interface CategoryInfo {
  id: CommunityCategory;
  label: string;
  bgColor?: string;
}

// 정렬 옵션 타입
export type SortOption = 'recent' | 'likes';

// 기간 필터 타입
export type PeriodFilter = 'all' | 'day' | 'week' | 'month' | 'year';