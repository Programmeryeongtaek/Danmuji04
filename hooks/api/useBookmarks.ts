'use client';

import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';

// 북마크 타입 정의
export type BookmarkType = 'post' | 'study' | 'lecture';

interface BookmarkStatus {
  isBookmarked: boolean;
}

interface BookmarkItem {
  id: string | number;
  type: BookmarkType;
}

interface BookmarkConfig {
  tableName: string;
  foreignKey: string;
  queryPrefix: string;
}

// 북마크 삽입 데이터 타입 정의
interface PostBookmarkInsert {
  post_id: number;
  user_id: string;
  created_at?: string;
}

interface StudyBookmarkInsert {
  study_id: string;
  user_id: string;
  created_at?: string;
}

interface LectureBookmarkInsert {
  lecture_id: number;
  user_id: string;
  created_at?: string;
}

// 스터디 북마크 응답 타입 (Supabase 조인 결과)
interface StudyBookmarkRow {
  id: string;
  study_id: string;
  user_id: string;
  created_at: string;
  notes: string | null;
  importance: number;
  studies: {
    id: string;
    title: string;
    category: string;
    description: string;
    owner_id: string;
    owner_name: string;
    max_participants: number;
    current_participants: number;
    approved_participants: number;
    start_date: string;
    end_date: string;
    status: 'recruiting' | 'in_progress' | 'completed';
    book_id?: string | null;
    books?: {
      id: string;
      title: string;
    } | null;
  };
}

// 변환된 스터디 북마크 타입 (컴포넌트에서 사용)
export interface BookmarkedStudy {
  id: string;
  study_id: string;
  user_id: string;
  created_at: string;
  notes: string | null;
  importance: number;
  study: {
    id: string;
    title: string;
    category: string;
    description: string;
    owner_id: string;
    owner_name: string;
    max_participants: number;
    current_participants: number;
    approved_participants: number;
    start_date: string;
    end_date: string;
    status: 'recruiting' | 'in_progress' | 'completed';
    book_id?: string | null;
    book_title?: string | null;
  };
}

// 강의 북마크 타입
export interface BookmarkedLecture {
  id: number;
  user_id: string;
  lecture_id: number;
  created_at: string;
  lectures: {
    id: number;
    title: string;
    thumbnail_url: string;
    category: string;
    instructor: string;
    depth: string;
    keyword: string;
    group_type: string;
    likes: number;
    students: number;
    createdAt: string;
    href?: string;
  };
}

// 게시글 북마크 타입
export interface BookmarkedPost {
  id: number;
  user_id: string;
  post_id: number;
  created_at: string;
  importance: number;
  memo: string;
  community_posts: {
    id: number;
    title: string;
    content: string;
    category_id: string;
    author_id: string;
    views: number;
    likes: number;
    created_at: string;
    updated_at: string;
  };
}

type BookmarkInsertData = PostBookmarkInsert | StudyBookmarkInsert | LectureBookmarkInsert;

export type BookmarkResult<T extends BookmarkType> =
  T extends 'study' ? BookmarkedStudy[] :
  T extends 'lecture' ? BookmarkedLecture[] :
  T extends 'post' ? BookmarkedPost[] : never;

// 북마크 타입별 설정
const BOOKMARK_CONFIGS: Record<BookmarkType, BookmarkConfig> = {
  post: {
    tableName: 'post_bookmarks',
    foreignKey: 'post_id',
    queryPrefix: 'post-bookmark',
  },
  study: {
    tableName: 'study_bookmarks',
    foreignKey: 'study_id',
    queryPrefix: 'study-bookmark',
  },
  lecture: {
    tableName: 'bookmarks',
    foreignKey: 'lecture_id',
    queryPrefix: 'lecture-bookmark',
  },
};

// 특정 아이템의 북마크 상태 조회
export const useBookmarkStatus = (id: string | number, type: BookmarkType) => {
  const user = useAtomValue(userAtom);
  const config = BOOKMARK_CONFIGS[type];

  return useQuery({
    queryKey: [config.queryPrefix, 'status', id],
    queryFn: async (): Promise<BookmarkStatus> => {
      if (!user) {
        return { isBookmarked: false };
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from(config.tableName)
        .select('id')
        .eq(config.foreignKey, id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error(`북마크 상태 조회 실패 (${type}):`, error);
        return { isBookmarked: false };
      }

      return { isBookmarked: !!data };
    },
    enabled: !!id && !!user,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// 여러 아이템의 북마크 상태 배치 조회
export const useBookmarksStatus = (items: BookmarkItem[]) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: ['bookmarks-batch-status', items.map(item => `${item.type}-${item.id}`).sort()],
    queryFn: async (): Promise<Record<string, BookmarkStatus>> => {
      if (!user || items.length === 0) {
        return items.reduce((acc, item) => {
          acc[`${item.type}-${item.id}`] = { isBookmarked: false };
          return acc;
        }, {} as Record<string, BookmarkStatus>);
      }

      const supabase = createClient();
      const result: Record<string, BookmarkStatus> = {};

      // 타입별로 그룹화하여 배치 조회
      const itemsByType = items.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item.id);
        return acc;
      }, {} as Record<BookmarkType, (string | number)[]>);

      // 각 타입별로 배치 조회 - 간단한 방법
      await Promise.all(
        Object.entries(itemsByType).map(async ([type, ids]) => {
          const config = BOOKMARK_CONFIGS[type as BookmarkType];
          const { data } = await supabase
            .from(config.tableName)
            .select(config.foreignKey)
            .eq('user_id', user.id)
            .in(config.foreignKey, ids);

          // 간단한 타입 단언 사용
          const bookmarkedIds = new Set(
            data?.map(item => item[config.foreignKey as keyof typeof item]) || []
          );

          // 해당 타입의 모든 아이템에 대해 북마크 상태 설정
          ids.forEach(id => {
            result[`${type}-${id}`] = { isBookmarked: bookmarkedIds.has(id) };
          });
        })
      );

      return result;
    },
    enabled: items.length > 0,
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  });
};

// 북마크 토글
export const useToggleBookmark = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, type }: { id: string | number; type: BookmarkType }): Promise<boolean> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();
      const config = BOOKMARK_CONFIGS[type];

      // 현재 북마크 상태 확인
      const { data: existingBookmark } = await supabase
        .from(config.tableName)
        .select('id')
        .eq(config.foreignKey, id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingBookmark) {
        // 북마크 제거
        const { error } = await supabase
          .from(config.tableName)
          .delete()
          .eq('id', existingBookmark.id);

        if (error) throw error;
        return false;
      } else {
        // 북마크 추가
        let insertData: BookmarkInsertData;
        
        if (type === 'post') {
          insertData = {
            post_id: id as number,
            user_id: user.id,
            created_at: new Date().toISOString(),
          } as PostBookmarkInsert;
        } else if (type === 'study') {
          insertData = {
            study_id: id as string,
            user_id: user.id,
            created_at: new Date().toISOString(),
          } as StudyBookmarkInsert;
        } else {
          insertData = {
            lecture_id: id as number,
            user_id: user.id,
            created_at: new Date().toISOString(),
          } as LectureBookmarkInsert;
        }

        const { error } = await supabase
          .from(config.tableName)
          .insert(insertData);

        if (error) throw error;
        return true;
      }
    },
    onMutate: async ({ id, type }) => {
      const config = BOOKMARK_CONFIGS[type];
      const queryKey = [config.queryPrefix, 'status', id];

      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey });

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData<BookmarkStatus>(queryKey);

      // 낙관적 업데이트
      if (previousData) {
        queryClient.setQueryData<BookmarkStatus>(queryKey, {
          isBookmarked: !previousData.isBookmarked,
        });
      }

      // 배치 쿼리도 업데이트
      queryClient.setQueriesData<Record<string, BookmarkStatus>>(
        {
          predicate: (query) =>
            query.queryKey[0] === 'bookmarks-batch-status' &&
            Array.isArray(query.queryKey[1]) &&
            query.queryKey[1].includes(`${type}-${id}`),
        },
        (oldData) => {
          if (!oldData) return oldData;

          const key = `${type}-${id}`;
          if (!oldData[key]) return oldData;

          return {
            ...oldData,
            [key]: {
              isBookmarked: !oldData[key].isBookmarked,
            },
          };
        }
      );

      return { previousData, queryKey };
    },
    onError: (error, { id, type }, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      // 배치 쿼리 무효화로 정확한 데이터 다시 가져오기
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'bookmarks-batch-status' &&
          Array.isArray(query.queryKey[1]) &&
          query.queryKey[1].includes(`${type}-${id}`),
      });

      if (error instanceof Error && error.message === '로그인이 필요합니다.') {
        showToast('로그인이 필요합니다.', 'error');
      } else {
        console.error('북마크 토글 실패:', error);
        showToast('북마크 처리에 실패했습니다.', 'error');
      }
    },
    onSuccess: (isBookmarked, { id, type }) => {
      const config = BOOKMARK_CONFIGS[type];
      
      // 성공 시 관련 쿼리들 무효화하여 최신 상태 보장
      queryClient.invalidateQueries({ 
        queryKey: [config.queryPrefix, 'status', id]
      });
      
      queryClient.invalidateQueries({ 
        queryKey: [config.queryPrefix, 'list'] 
      });

      // 배치 쿼리들도 무효화
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'bookmarks-batch-status'
      });

      // 게시글 목록 등 다른 관련 쿼리들도 무효화
      if (type === 'post') {
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      }

      const messages = {
        post: isBookmarked ? '게시글이 북마크에 추가되었습니다.' : '게시글 북마크가 취소되었습니다.',
        study: isBookmarked ? '스터디가 북마크에 추가되었습니다.' : '스터디 북마크가 취소되었습니다.',
        lecture: isBookmarked ? '강의가 찜하기에 추가되었습니다.' : '강의 찜하기가 취소되었습니다.',
      };

      showToast(messages[type], 'success');
    },
  });
};

// 북마크된 아이템 목록 조회
export const useBookmarksList = (type: BookmarkType, options?: {
  page?: number;
  limit?: number;
}) => {
  const user = useAtomValue(userAtom);
  const config = BOOKMARK_CONFIGS[type];
  const { page = 1, limit = 10 } = options || {};

  return useQuery({
    queryKey: [config.queryPrefix, 'list', page, limit],
    queryFn: async () => {
      if (!user) return [];

      const supabase = createClient();
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      if (type === 'study') {
        // 스터디 북마크 조회
        const { data, error } = await supabase
          .from('study_bookmarks')
          .select(`
            *,
            studies!inner (
              *,
              books (
                id,
                title
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        // 타입 변환: StudyBookmarkRow[] → BookmarkedStudy[]
        return (data as StudyBookmarkRow[]).map((bookmark) => ({
          ...bookmark,
          study: {
            ...bookmark.studies,
            book_title: bookmark.studies.books?.title || null,
          },
        }));
      }

      if (type === 'lecture') {
        // 강의 북마크 조회
        const { data, error } = await supabase
          .from('bookmarks')
          .select(`
            *,
            lectures (*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        return data || [];
      }

      // 
      const query = supabase
        .from(config.tableName)
        .select(`
          *,
          ${type === 'post' ? 'community_posts(*)' : 'lectures(*)'}  
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });
};

// 북마크 상태 확인을 위한 헬퍼 훅
export const usePostBookmark = (postId: number) => {
  return useBookmarkStatus(postId, 'post');
};

export const useStudyBookmark = (studyId: string) => {
  return useBookmarkStatus(studyId, 'study');
};

export const useLectureBookmark = (lectureId: number) => {
  return useBookmarkStatus(lectureId, 'lecture');
};

// 특정 타입의 북마크 삭제 (다중 선택 삭제)
export const useDeleteBookmarks = (type: BookmarkType) => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast(); // () 추가
  const config = BOOKMARK_CONFIGS[type];

  return useMutation({
    mutationFn: async (ids: (string | number)[]): Promise<number> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();

      const { error } = await supabase
        .from(config.tableName)
        .delete()
        .eq('user_id', user.id)
        .in(config.foreignKey, ids);

      if (error) throw error;
      return ids.length;
    },
    onSuccess: (deletedCount, ids) => {
      showToast(`${deletedCount}개의 북마크가 삭제되었습니다.`, 'success');

      // 개별 상태 쿼리들 무효화
      ids.forEach(id => {
        queryClient.removeQueries({
          queryKey: [config.queryPrefix, 'status', id]
        });
      });

      // 목록 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: [config.queryPrefix, 'list']
      });

      // 배치 쿼리들 무효화
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'bookmarks-batch-status'
      });
    },
    onError: (error) => {
      console.error('북마크 삭제 실패:', error);
      showToast('북마크 삭제에 실패했습니다.', 'error');
    },
  });
};