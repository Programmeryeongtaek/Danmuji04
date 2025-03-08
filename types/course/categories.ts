export const COURSE_CATEGORIES = {
  reading: {
    id: 'reading',
    title: '독서',
    description: '독서를 해야 하는 이유와 독서법을 모아놓은 코스'
  },
  writing: {
    id: 'writing',
    title: '글쓰기',
    description: '글쓰기를 해야 하는 이유와 노하우를 모아놓은 코스'
  },
  question: {
    id: 'question',
    title: '질문',
    description: '질문하는 능력과 질문의 중요성을 모아놓은 코스'
  }
  // 새 카테고리는 여기에 추가
} as const;

// 타입 추론을 통해 카테고리 ID 타입 정의
export type CourseCategory = keyof typeof COURSE_CATEGORIES;

// 카테고리 ID 배열 (Object.keys로 자동 생성)
export const CATEGORY_IDS = Object.keys(COURSE_CATEGORIES) as CourseCategory[];

// 카테고리 이름 조회 함수
export function getCategoryTitle(category: string): string {
  return (COURSE_CATEGORIES[category as CourseCategory]?.title) || category;
}

// 런타임에 유효한 카테고리인지 확인
export function isValidCategory(category: string): category is CourseCategory {
  return category in COURSE_CATEGORIES;
}