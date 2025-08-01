export interface Lecture {
  id: number;
  title: string;
  thumbnail_url: string;
  category: string;
  instructor: string;
  depth: string;
  keyword: string;
  group_type: string;
  is_free: boolean;
  price: number;
  likes: number;
  students: number;
  createdAt: string;
  href: string;
}

export interface CategoryProps {
  selectedCategory: string;
  onCategoryClick: (category: string) => void;
}

export interface LectureSectionProps {
  selectedCategory: string;
}

export interface FilterState {
  depth: string[];
  fields: string[];
  hasGroup: boolean;
}

export interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 수강평
export interface ReviewProps {
  id: number;
  rating: number;
  content: string;
  created_at: string;
  user_id: string;
  lecture_id: number;
  user_profile?: {
    id: string;
    name: string;
    nickname: string;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  is_liked: boolean;
  replies:ReplyProps[];
}
export interface ReplyProps {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  user_profile: {
    id: string;
    name: string;
    nickname: string | null; 
    avatar_url: string | null;
  } | null;
  likes_count: number;
  is_liked: boolean;
}

export interface FetchedReply {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  user_profile: {
    id: string;
    user_name: string;
    avatar_url: string | null;
  } | null;
  likes_count: { count: number }[];
}

export interface ReviewListProps {
  reviews: ReviewProps[];
  currentUserId?: string | null;
  onDelete: (reviewId: number) => void;
}

export interface ReviewItemProps {
  review: ReviewProps;
  currentUserId?: string | null;
  onDelete: (reviewId: number) => void;
}

export interface ReviewReplyProps {
  reply: ReplyProps;
  currentUserId?: string | null;
  onDelete: (replyId: number) => void;
  onUpdate: (replyId: number, isLiked: boolean, likesCount: number) => void;
  onEdit: (replyId: number, content: string) => void;
}

// 찜하기
export interface Bookmark {
  id: number;
  user_id: string;
  lecture_id: number;
  created_at: string;
  lecture: Lecture;
}