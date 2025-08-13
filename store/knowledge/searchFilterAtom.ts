import { atom } from 'jotai';

export interface SearchFilterState {
  searchQuery: string;
  selectedCategory: string;
  selectedKeywords: string[];
  filters: {
    depth: string[];
    fields: string[];
    hasGroup: boolean;
  };
  sortOption: string;
  lastUpdated: number | null;
}

// 기본 검색 필터 상태
const searchFilterStateAtom = atom<SearchFilterState>({
  searchQuery: '',
  selectedCategory: 'all',
  selectedKeywords: [],
  filters: {
    depth: [],
    fields: [],
    hasGroup: false,
  },
  sortOption: 'latest',
  lastUpdated: null,
});

// 읽기 전용
export const searchFilterAtom = atom((get) => get(searchFilterStateAtom));

// 검색어 업데이트
export const updateSearchQueryAtom = atom(
  null,
  (get, set, searchQuery: string) => {
    const currentState = get(searchFilterStateAtom);
    set(searchFilterStateAtom, {
      ...currentState,
      searchQuery,
      lastUpdated: Date.now(),
    });
  }
);

// 카테고리 업데이트 - 카테고리 변경시 필터 초기화
export const updateCategoryAtom = atom(
  null,
  (get, set, selectedCategory: string) => {
    const currentState = get(searchFilterStateAtom);
    set(searchFilterStateAtom, {
      ...currentState,
      selectedCategory,
      // 카테고리 변경시 필터 초기화
      filters: {
        depth: [],
        fields: [],
        hasGroup: false,
      },
      selectedKeywords: [], // 키워드도 초기화
      lastUpdated: Date.now(),
    });
  }
);

// 키워드 업데이트
export const updateKeywordsAtom = atom(
  null,
  (get, set, selectedKeywords: string[]) => {
    const currentState = get(searchFilterStateAtom);
    set(searchFilterStateAtom, {
      ...currentState,
      selectedKeywords,
      lastUpdated: Date.now(),
    });
  }
);

// 키워드 토글 (개별 키워드 추가/제거)
export const toggleKeywordAtom = atom(
  null,
  (get, set, keyword: string) => {
    const currentState = get(searchFilterStateAtom);
    const isSelected = currentState.selectedKeywords.includes(keyword);

    const newKeywords = isSelected
      ? currentState.selectedKeywords.filter(k => k !== keyword)
      : [...currentState.selectedKeywords, keyword];

    set(searchFilterStateAtom, {
      ...currentState,
      selectedKeywords: newKeywords,
      lastUpdated: Date.now(),
    });
  }
);

// 필터 업데이트
export const updateFiltersAtom = atom(
  null,
  (get, set, filters: SearchFilterState['filters']) => {
    const currentState = get(searchFilterStateAtom);
    set(searchFilterStateAtom, {
      ...currentState,
      filters,
      lastUpdated: Date.now(),
    });
  }
);

// 깊이 필터 토글
export const toggleDepthFilterAtom = atom(
  null,
  (get, set, depth: string) => {
    const currentState = get(searchFilterStateAtom);
    const isSelected = currentState.filters.depth.includes(depth);

    const newDepths = isSelected
      ? currentState.filters.depth.filter(d => d !== depth)
      : [...currentState.filters.depth, depth];

    set(searchFilterStateAtom, {
      ...currentState,
      filters: {
        ...currentState.filters,
        depth: newDepths,
      },
      lastUpdated: Date.now(),
    });
  }
);

// 분야 필터 토글
export const toggleFieldFilterAtom = atom(
  null,
  (get, set, field: string) => {
    const currentState = get(searchFilterStateAtom);
    const isSelected = currentState.filters.fields.includes(field);

    const newFields = isSelected
      ? currentState.filters.fields.filter(f => f !== field)
      : [...currentState.filters.fields, field];

    set(searchFilterStateAtom, {
      ...currentState,
      filters: {
        ...currentState.filters,
        fields: newFields,
      },
      lastUpdated: Date.now(),
    });
  }
);

// 오프라인 모임 필터 토글
export const toggleGroupFilterAtom = atom(
  null,
  (get, set) => {
    const currentState = get(searchFilterStateAtom);
    set(searchFilterStateAtom, {
      ...currentState,
      filters: {
        ...currentState.filters,
        hasGroup: !currentState.filters.hasGroup,
      },
      lastUpdated: Date.now(),
    });
  }
);

// 정렬 옵션 업데이트
export const updateSortOptionAtom = atom(
  null,
  (get, set, sortOption: string) => {
    const currentState = get(searchFilterStateAtom);
    set(searchFilterStateAtom, {
      ...currentState,
      sortOption,
      lastUpdated: Date.now(),
    });
  }
);

// 모든 필터 초기화
export const resetFiltersAtom = atom(
  null,
  (get, set) => {
    set(searchFilterStateAtom, {
      searchQuery: '',
      selectedCategory: 'all',
      selectedKeywords: [],
      filters: {
        depth: [],
        fields: [],
        hasGroup: false,
      },
      sortOption: 'latest',
      lastUpdated: Date.now(),
    });
  }
);

// URL에서 상태 초기화 (검색 파라미터 동기화)
export const initializeFromUrlAtom = atom(
  null,
  (get, set, params: {
    q?: string;
    category?: string;
    keywords?: string;
    depth?: string;
    fields?: string;
    hasGroup?: string;
    sort?: string;
  }) => {
    const currentState = get(searchFilterStateAtom);
    
    const keywordsArray = params.keywords ? params.keywords.split(',') : [];
    const depthArray = params.depth ? params.depth.split(',') : [];
    const fieldsArray = params.fields ? params.fields.split(',') : [];
    
    // 카테고리가 변경된 경우에만 필터 초기화
    const categoryChanged = params.category !== currentState.selectedCategory;
    
    set(searchFilterStateAtom, {
      searchQuery: params.q || '',
      selectedCategory: params.category || 'all',
      selectedKeywords: categoryChanged ? [] : keywordsArray, // 카테고리 변경시 키워드 초기화
      filters: {
        depth: categoryChanged ? [] : depthArray, // 카테고리 변경시 필터 초기화
        fields: categoryChanged ? [] : fieldsArray,
        hasGroup: categoryChanged ? false : (params.hasGroup === 'true'),
      },
      sortOption: params.sort || 'latest',
      lastUpdated: Date.now(),
    });
  }
);

// URL 파라미터 생성 (필터가 있는 경우에만)
export const getUrlParamsAtom = atom((get) => {
  const state = get(searchFilterStateAtom);
  const params = new URLSearchParams();

  if (state.searchQuery) {
    params.set('q', state.searchQuery);
  }
  
  if (state.selectedCategory && state.selectedCategory !== 'all') {
    params.set('category', state.selectedCategory);
  }
  
  if (state.selectedKeywords.length > 0) {
    params.set('keywords', state.selectedKeywords.join(','));
  }
  
  if (state.filters.depth.length > 0) {
    params.set('depth', state.filters.depth.join(','));
  }
  
  if (state.filters.fields.length > 0) {
    params.set('fields', state.filters.fields.join(','));
  }
  
  if (state.filters.hasGroup) {
    params.set('hasGroup', 'true');
  }
  
  if (state.sortOption && state.sortOption !== 'latest') {
    params.set('sort', state.sortOption);
  }

  return params.toString();
});

// 활성화된 필터가 있는지 확인하는 atom (키워드 제외)
export const hasActiveFiltersAtom = atom((get) => {
  const state = get(searchFilterStateAtom);
  
  return (
    state.filters.depth.length > 0 ||
    state.filters.fields.length > 0 ||
    state.filters.hasGroup
  );
});