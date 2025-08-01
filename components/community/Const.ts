// 커뮤니티 카테고리 타입 정의
export type CommunityCategory = 'all' | 'notice' | 'chats' | 'faq';

// 카테고리 정보 인터페이스
export interface CategoryInfo {
  id: CommunityCategory;
  label: string;
  bgColor?: string; // 카테고리별 색상 (선택사항)
}

// 커뮤니티 카테고리 상수
export const COMMUNITY_CATEGORIES: readonly CategoryInfo[] = [
  { id: 'all', label: '전체' },
  { id: 'notice', label: '공지사항', bgColor: 'bg-red-100 text-red-800' },
  { id: 'chats', label: '자유게시판', bgColor: 'bg-gray-100 text-gray-800' },
  { id: 'faq', label: '질문 게시판', bgColor: 'bg-blue-100 text-blue-800' },
] as const;

// 정렬 옵션 타입
export type SortOption = 'recent' | 'likes';

// 정렬 옵션 상수
export const SORT_OPTIONS: readonly { value: SortOption; label: string }[] = [
  { value: 'recent', label: '최신순' },
  { value: 'likes', label: '좋아요순' },
] as const;

// 카테고리 ID로 라벨 찾기
export const getCategoryLabel = (categoryId: CommunityCategory): string => {
  const category = COMMUNITY_CATEGORIES.find(cat => cat.id === categoryId);
  return category?.label || categoryId;
};

// 카테고리 ID로 스타일 찾기
export const getCategoryStyle = (categoryId: CommunityCategory): string => {
  const category = COMMUNITY_CATEGORIES.find(cat => cat.id === categoryId);
  return category?.bgColor || 'bg-gray-100 text-gray-800';
};

// 카테고리 ID가 유효한지 확인
export const isValidCategory = (categoryId: string): categoryId is CommunityCategory => {
  return COMMUNITY_CATEGORIES.some(cat => cat.id === categoryId);
};

// 기간 필터 타입
export type PeriodFilter = 'all' | 'day' | 'week' | 'month' | 'year';

// 기간 필터 옵션 상수
export const PERIOD_OPTIONS: readonly { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'day', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
] as const;