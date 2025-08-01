import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface CachedLecture {
    id: number;
  title: string;
  instructor: string;
  category: string;
  keyword: string;
  depth: string;
  thumbnail_url: string;
  group_type: string;
  is_free: boolean;
  price: number;
  likes: number;
  students: number;
  createdAt: string;
  href: string;
}

export interface LectureSection {
    id: number;
  lecture_id: number;
  title: string;
  order_index: number;
  created_at: string;
}

export interface SearchFilters {
  depth?: string[];
  fields?: string[];
  hasGroup?: boolean;
}

export const lectureKeys = {
  all: ['lectures'] as const,
  lists: () => [...lectureKeys.all, 'list'] as const,
  list: (category: string) => [...lectureKeys.lists(), category] as const,
  searches: () => [...lectureKeys.all, 'search'] as const,
  search: (query: string, filters?: SearchFilters) => [...lectureKeys.searches(), query, filters] as const,
  details: () => [...lectureKeys.all, 'detail'] as const,
  detail: (id: number) => [...lectureKeys.details(), id] as const,
  sections: () => [...lectureKeys.all, 'sections'] as const,
  section: (lectureId: number) => [...lectureKeys.sections(), lectureId] as const,
};

// 강의 목록 조회 (카테고리별)
export const useLectureList = (category: string) => {
  return useQuery({
    queryKey: lectureKeys.list(category),
    queryFn: async (): Promise<CachedLecture[]> => {
      const supabase = createClient();
      
      let query = supabase
        .from('lectures')
        .select(`
          id, title, instructor, category, keyword, depth, 
          thumbnail_url, group_type, is_free, price, 
          likes, students, created_at, updated_at
        `);
      
      if (category !== 'all') {
        query = query.eq('category', category);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
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
        createdAt: item.created_at,
        href: `/knowledge/lecture/${item.id}`,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000,   // 30분
  });
};

// 강의 검색
export const useLectureSearch = (searchQuery: string, filters?: SearchFilters) => {
  return useQuery({
    queryKey: lectureKeys.search(searchQuery, filters),
    queryFn: async (): Promise<CachedLecture[]> => {
      const supabase = createClient();
      
      let query = supabase
        .from('lectures')
        .select(`
          id, title, instructor, category, keyword, depth,
          thumbnail_url, group_type, is_free, price,
          likes, students, created_at, updated_at
        `);
      
      // 검색어 필터링
      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,instructor.ilike.%${searchQuery}%,keyword.ilike.%${searchQuery}%`
        );
      }
      
      // 추가 필터 적용
      if (filters?.depth?.length) {
        query = query.in('depth', filters.depth);
      }
      if (filters?.fields?.length) {
        query = query.in('category', filters.fields);
      }
      if (filters?.hasGroup) {
        query = query.neq('group_type', 'online');
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
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
        createdAt: item.created_at,
        href: `/knowledge/lecture/${item.id}`,
      }));
    },
    enabled: Boolean(searchQuery),
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

// 강의 상세 정보 조회
export const useLectureDetail = (lectureId: number) => {
  return useQuery({
    queryKey: lectureKeys.detail(lectureId),
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('id', lectureId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(lectureId),
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 60 * 60 * 1000, // 60분
  });
};

// 강의 섹션 조회
export const useLectureSections = (lectureId: number) => {
  return useQuery({
    queryKey: lectureKeys.section(lectureId),
    queryFn: async(): Promise<LectureSection[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('lecture_sections')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(lectureId),
    staleTime: 15 * 60 * 1000, // 15분
    gcTime: 60 * 60 * 1000, // 60분
  });
};