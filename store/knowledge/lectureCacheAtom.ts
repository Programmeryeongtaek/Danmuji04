import { Lecture } from '@/app/types/knowledge/lecture';
import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

// 검색 필터 타입 정의
export interface SearchFilters {
  depth?: string[];           // 강의 난이도
  fields?: string[];          // 분야
  hasGroup?: boolean;         // 오프라인 모임 여부
  keywords?: string[];        // 키워드
  sortOption?: string;        // 정렬 옵션
}

export type CachedLecture = Lecture;

// 강의 섹션 정보 타입
export interface CachedLectureSection {
  id: number;
  lecture_id: number;
  title: string;
  order_num: number;
  lecture_items: CachedLectureItem[];
}

// 강의 아이템 정보 타입
export interface CachedLectureItem {
  id: number;
  section_id: number;
  title: string;
  type: 'video' | 'text';
  content_url: string;
  duration?: string;
  order_num: number;
}

// 캐시 상태
export interface LectureCacheState {
  lectures: Record<string, CachedLecture[]>; // 카테고리별 강의 캐시
  sections: Record<string, CachedLectureSection[]>; // 강의별 섹션 캐시
  lectureDetails: Record<number, CachedLecture>; // 개별 강의 상세 정보 캐시
  searchResults: Record<string, CachedLecture[]>; // 검색 결과 캐시
  lastFetched: Record<string, number>; // 마지막 조회 시간
  isLoading: Record<string, boolean>; // 로딩 상태
}

// 캐시 만료 시간 (5분)
const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

// 기본 캐시 상태
const lectureCacheStateAtom = atom<LectureCacheState>({
  lectures: {},
  sections: {},
  lectureDetails: {},
  searchResults: {},
  lastFetched: {},
  isLoading: {},
});

// 읽기 전용
export const lectureCacheAtom = atom((get) => get(lectureCacheStateAtom));

// 캐시 유효성 확인 함수
const isCacheValid = (lastFetched: number | undefined): boolean => {
  if (!lastFetched) return false;
  return Date.now() - lastFetched < CACHE_EXPIRY_TIME;
};

// 카테고리별 강의 목록 캐싱
export const fetchAndCacheLecturesByCategoryAtom = atom(
  null,
  async (get, set, category: string, forceRefresh = false) => {
    const currentState = get(lectureCacheStateAtom);
    const cacheKey = `category_${category}`;
    
    // 캐시 유효성 확인
    if (!forceRefresh && 
        currentState.lectures[cacheKey] && 
        isCacheValid(currentState.lastFetched[cacheKey])) {
      return currentState.lectures[cacheKey];
    }

    // 로딩 상태 설정
    set(lectureCacheStateAtom, {
      ...currentState,
      isLoading: {
        ...currentState.isLoading,
        [cacheKey]: true,
      },
    });

    try {
      const supabase = createClient();
      
      let query = supabase
        .from('lectures')
        .select(`
          id, 
          title, 
          instructor, 
          category, 
          keyword, 
          depth, 
          thumbnail_url,
          group_type,
          is_free,
          price,
          likes,
          students,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });
      
      // 카테고리 필터링
      if (category !== 'all') {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // 데이터를 Lecture 형태로 변환
      const lectures: CachedLecture[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        thumbnail_url: item.thumbnail_url || '',
        category: item.category,
        instructor: item.instructor,
        depth: item.depth,
        keyword: item.keyword,
        group_type: item.group_type || 'online',
        is_free: item.is_free ?? true,
        price: item.price || 0,
        likes: item.likes || 0,
        students: item.students || 0,
        createdAt: item.created_at, // created_at → createdAt 변환
        href: `/knowledge/lecture/${item.id}`,
      }));
      
      // 캐시 업데이트
      set(lectureCacheStateAtom, {
        ...currentState,
        lectures: {
          ...currentState.lectures,
          [cacheKey]: lectures,
        },
        lastFetched: {
          ...currentState.lastFetched,
          [cacheKey]: Date.now(),
        },
        isLoading: {
          ...currentState.isLoading,
          [cacheKey]: false,
        },
      });
      
      return lectures;
    } catch (error) {
      console.error('강의 목록 조회 실패:', error);
      
      // 에러 시 로딩 상태 해제
      set(lectureCacheStateAtom, {
        ...currentState,
        isLoading: {
          ...currentState.isLoading,
          [cacheKey]: false,
        },
      });
      
      throw error;
    }
  }
);

// 검색 결과 캐싱
export const fetchAndCacheSearchResultsAtom = atom(
  null,
  async (get, set, searchQuery: string, filters?: SearchFilters, forceRefresh = false) => {
    const currentState = get(lectureCacheStateAtom);
    const cacheKey = `search_${searchQuery}_${JSON.stringify(filters || {})}`;
    
    // 캐시 유효성 확인
    if (!forceRefresh && 
        currentState.searchResults[cacheKey] && 
        isCacheValid(currentState.lastFetched[cacheKey])) {
      return currentState.searchResults[cacheKey];
    }

    // 로딩 상태 설정
    set(lectureCacheStateAtom, {
      ...currentState,
      isLoading: {
        ...currentState.isLoading,
        [cacheKey]: true,
      },
    });

    try {
      const supabase = createClient();
      
      let query = supabase
        .from('lectures')
        .select(`
          id, 
          title, 
          instructor, 
          category, 
          keyword, 
          depth, 
          thumbnail_url,
          group_type,
          is_free,
          price,
          likes,
          students,
          created_at,
          updated_at
        `);
      
      // 검색어 필터링
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,instructor.ilike.%${searchQuery}%,keyword.ilike.%${searchQuery}%`);
      }
      
      // 추가 필터 적용
      if (filters) {
        if (filters.depth && filters.depth.length > 0) {
          query = query.in('depth', filters.depth);
        }
        if (filters.fields && filters.fields.length > 0) {
          query = query.in('category', filters.fields);
        }
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // 데이터를 Lecture 형태로 변환
      const results: CachedLecture[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        thumbnail_url: item.thumbnail_url || '',
        category: item.category,
        instructor: item.instructor,
        depth: item.depth,
        keyword: item.keyword,
        group_type: item.group_type || 'online',
        is_free: item.is_free ?? true,
        price: item.price || 0,
        likes: item.likes || 0,
        students: item.students || 0,
        createdAt: item.created_at, // created_at → createdAt 변환
        href: `/knowledge/lecture/${item.id}`,
      }));
      
      // 캐시 업데이트
      set(lectureCacheStateAtom, {
        ...currentState,
        searchResults: {
          ...currentState.searchResults,
          [cacheKey]: results,
        },
        lastFetched: {
          ...currentState.lastFetched,
          [cacheKey]: Date.now(),
        },
        isLoading: {
          ...currentState.isLoading,
          [cacheKey]: false,
        },
      });
      
      return results;
    } catch (error) {
      console.error('검색 결과 조회 실패:', error);
      
      // 에러 시 로딩 상태 해제
      set(lectureCacheStateAtom, {
        ...currentState,
        isLoading: {
          ...currentState.isLoading,
          [cacheKey]: false,
        },
      });
      
      throw error;
    }
  }
);

// 강의 상세 정보 캐싱
export const fetchAndCacheLectureDetailAtom = atom(
  null,
  async (get, set, lectureId: number, forceRefresh = false) => {
    const currentState = get(lectureCacheStateAtom);
    const cacheKey = `detail_${lectureId}`;
    
    // 캐시 유효성 확인
    if (!forceRefresh && 
        currentState.lectureDetails[lectureId] && 
        isCacheValid(currentState.lastFetched[cacheKey])) {
      return currentState.lectureDetails[lectureId];
    }

    // 로딩 상태 설정
    set(lectureCacheStateAtom, {
      ...currentState,
      isLoading: {
        ...currentState.isLoading,
        [cacheKey]: true,
      },
    });

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('id', lectureId)
        .single();
      
      if (error) throw error;
      
      // 데이터를 Lecture 형태로 변환
      const lectureDetail: CachedLecture = {
        id: data.id,
        title: data.title,
        thumbnail_url: data.thumbnail_url || '',
        category: data.category,
        instructor: data.instructor,
        depth: data.depth,
        keyword: data.keyword,
        group_type: data.group_type || 'online',
        is_free: data.is_free ?? true,
        price: data.price || 0,
        likes: data.likes || 0,
        students: data.students || 0,
        createdAt: data.created_at, // created_at → createdAt 변환
        href: `/knowledge/lecture/${data.id}`,
      };
      
      // 캐시 업데이트
      set(lectureCacheStateAtom, {
        ...currentState,
        lectureDetails: {
          ...currentState.lectureDetails,
          [lectureId]: lectureDetail,
        },
        lastFetched: {
          ...currentState.lastFetched,
          [cacheKey]: Date.now(),
        },
        isLoading: {
          ...currentState.isLoading,
          [cacheKey]: false,
        },
      });
      
      return lectureDetail;
    } catch (error) {
      console.error('강의 상세 정보 조회 실패:', error);
      
      // 에러 시 로딩 상태 해제
      set(lectureCacheStateAtom, {
        ...currentState,
        isLoading: {
          ...currentState.isLoading,
          [cacheKey]: false,
        },
      });
      
      throw error;
    }
  }
);

// 강의 섹션 정보 캐싱
export const fetchAndCacheLectureSectionsAtom = atom(
  null,
  async (get, set, lectureId: number, forceRefresh = false) => {
    const currentState = get(lectureCacheStateAtom);
    const cacheKey = `sections_${lectureId}`;
    
    // 캐시 유효성 확인
    if (!forceRefresh && 
        currentState.sections[lectureId] && 
        isCacheValid(currentState.lastFetched[cacheKey])) {
      return currentState.sections[lectureId];
    }

    // 로딩 상태 설정
    set(lectureCacheStateAtom, {
      ...currentState,
      isLoading: {
        ...currentState.isLoading,
        [cacheKey]: true,
      },
    });

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('lecture_sections')
        .select(`
          id,
          lecture_id,
          title,
          order_num,
          lecture_items (
            id,
            section_id,
            title,
            type,
            content_url,
            duration,
            order_num
          )
        `)
        .eq('lecture_id', lectureId)
        .order('order_num', { ascending: true });
      
      if (error) throw error;
      
      const sections = data || [];
      
      // 캐시 업데이트
      set(lectureCacheStateAtom, {
        ...currentState,
        sections: {
          ...currentState.sections,
          [lectureId]: sections,
        },
        lastFetched: {
          ...currentState.lastFetched,
          [cacheKey]: Date.now(),
        },
        isLoading: {
          ...currentState.isLoading,
          [cacheKey]: false,
        },
      });
      
      return sections;
    } catch (error) {
      console.error('강의 섹션 조회 실패:', error);
      
      // 에러 시 로딩 상태 해제
      set(lectureCacheStateAtom, {
        ...currentState,
        isLoading: {
          ...currentState.isLoading,
          [cacheKey]: false,
        },
      });
      
      throw error;
    }
  }
);

// 캐시에서 강의 목록 조회
export const getCachedLecturesAtom = atom((get) => (category: string) => {
  const state = get(lectureCacheStateAtom);
  const cacheKey = `category_${category}`;
  return state.lectures[cacheKey] || null;
});

// 캐시에서 검색 결과 조회
export const getCachedSearchResultsAtom = atom((get) => (searchQuery: string, filters?: SearchFilters) => {
  const state = get(lectureCacheStateAtom);
  const cacheKey = `search_${searchQuery}_${JSON.stringify(filters || {})}`;
  return state.searchResults[cacheKey] || null;
});

// 캐시에서 강의 상세 정보 조회
export const getCachedLectureDetailAtom = atom((get) => (lectureId: number) => {
  const state = get(lectureCacheStateAtom);
  return state.lectureDetails[lectureId] || null;
});

// 캐시에서 강의 섹션 조회
export const getCachedLectureSectionsAtom = atom((get) => (lectureId: number) => {
  const state = get(lectureCacheStateAtom);
  return state.sections[lectureId] || null;
});

// 로딩 상태 조회
export const getCacheLoadingStateAtom = atom((get) => (cacheKey: string) => {
  const state = get(lectureCacheStateAtom);
  return state.isLoading[cacheKey] || false;
});

// 캐시 무효화 (특정 키)
export const invalidateCacheAtom = atom(
  null,
  (get, set, cacheKey: string) => {
    const currentState = get(lectureCacheStateAtom);
    
    const newLastFetched = { ...currentState.lastFetched };
    delete newLastFetched[cacheKey];
    
    set(lectureCacheStateAtom, {
      ...currentState,
      lastFetched: newLastFetched,
    });
  }
);

// 전체 캐시 초기화
export const clearAllCacheAtom = atom(
  null,
  (get, set) => {
    set(lectureCacheStateAtom, {
      lectures: {},
      sections: {},
      lectureDetails: {},
      searchResults: {},
      lastFetched: {},
      isLoading: {},
    });
  }
);

// 만료된 캐시 정리
export const cleanupExpiredCacheAtom = atom(
  null,
  (get, set) => {
    const currentState = get(lectureCacheStateAtom);
    const now = Date.now();
    
    const validLastFetched: Record<string, number> = {};
    
    Object.entries(currentState.lastFetched).forEach(([key, timestamp]) => {
      if (now - timestamp < CACHE_EXPIRY_TIME) {
        validLastFetched[key] = timestamp;
      }
    });
    
    set(lectureCacheStateAtom, {
      ...currentState,
      lastFetched: validLastFetched,
    });
  }
);