// 게시글 타입 정의
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

// 북마크된 게시글 타입
export interface BookmarkedPost extends Post {
  is_bookmarked: boolean;
  is_liked: boolean;
  bookmark_created_at: string;
  importance: number;
  memo: string;
}

// 사용자 프로필 타입
export interface Profile {
  id: string;
  name?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
}

// 댓글 타입 정의
export interface Comment {
  id: number;
  post_id: number;
  author_id: string;
  content: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  // 조회 결과에 추가되는 필드
  author_name?: string;
  author_avatar?: string | null;
  likes_count?: number;
  is_liked?: boolean;
  replies?: Comment[];
}

// 필터 옵션 타입 정의
export interface FilterOptions {
  category?: string;
  period?: 'all' | 'day' | 'week' | 'month' | 'year';
  sort?: 'recent' | 'likes';
  tag?: string;
}