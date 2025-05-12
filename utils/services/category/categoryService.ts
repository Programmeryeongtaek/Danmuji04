import { createClient } from '../../supabase/client';

// 초기 카테고리 매핑
const INITIAL_CATEGORY_MAP: Record<string, string> = {
  '독서': 'reading',
  '글쓰기': 'writing',
  '질문': 'question',
};

// 카테고리 매핑 캐시
let categoryMapCache: Record<string, string> = { ...INITIAL_CATEGORY_MAP };
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분 캐시

// 한글 카데고리 이름을 영문 키로 변환
export function convertCategoryToKey(name: string): string {
  // 1. 캐시된 매핑에서 찾으면 해당 키 반환
  if (categoryMapCache[name]) {
    return categoryMapCache[name];
  }

  // 2. 매핑에 없으면 카테고리 이름을 영문화하여 반환 (새로운 카테고리 자동 처리)
  const newKey = name
    .toLowerCase()
    .replace(/\s+/g, '-')        // 공백을 하이픈으로 변환
    .replace(/[^\w\-]/g, '');    // 알파벳, 숫자, 하이픈 외 문자 제거

  // 자동 생성된 키 캐시에 추가
  categoryMapCache[name] = newKey;
  return newKey;
}

/**
 * 데이터베이스에서 모든 카테고리를 가져와 매핑을 업데이트합니다.
 * @returns 카테고리 매핑 객체
 */
export async function updateCategoryMap(): Promise<Record<string, string>> {
  const now = Date.now();

  // 캐시가 유효하면 캐시된 매핑 반환
  if (now - lastFetchTime < CACHE_TTL) {
    return categoryMapCache;
  }

  try {
    const supabase = await createClient();

    // courses 테이블에서 모든 고유 카테고리 가져오기
    const { data: courseCategories, error: courseError } = await supabase
      .from('courses')
      .select('category')
      .not('category', 'is', null);

    if (courseError) throw courseError;

     // 모든 카테고리 결합
    const allCategories = [
      ...(courseCategories || []).map(item => item.category)
    ];

    // 중복 제거
    const uniqueCategories = [...new Set(allCategories)];

    // 기본 매핑으로 초기화
    categoryMapCache = { ...INITIAL_CATEGORY_MAP };

    // 데이터베이스 카테고리 처리
    uniqueCategories.forEach(category => {
      if (category && !categoryMapCache[category]) {
        // 영문 키로 변환하여 추가
        categoryMapCache[category] = convertCategoryToKey(category);
      }
    });

    // 캐시 타임스탬프 업데이트
    lastFetchTime = now;

    console.log('카테고리 매핑 업데이트 됨:', categoryMapCache);
    return categoryMapCache;
  } catch (error) {
    console.error('카테고리 매핑 업데이트 실패:', error);
    // 에러가 발생해도 기존 캐시 반환
    return categoryMapCache;
  }
}

/**
 * 카테고리 키로 한글 이름을 조회합니다.
 * @param key 카테고리 영문 키
 * @returns 한글 이름 또는 null
 */
export function getCategoryNameByKey(key: string): string | null {
  // key로 name을 찾는 역매핑 생성
  const reverseMap: Record<string, string> = {};
  
  Object.entries(categoryMapCache).forEach(([name, mapKey]) => {
    reverseMap[mapKey] = name;
  });
  
  return reverseMap[key] || null;
}