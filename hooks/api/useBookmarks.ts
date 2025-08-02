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

type BookmarkInsertData = PostBookmarkInsert | StudyBookmarkInsert | LectureBookmarkInsert;

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
      const { data } = await supabase
        .from(config.tableName)
        .select('id')
        .eq(config.foreignKey, id)
        .eq('user_id', user.id)
        .maybeSingle();

      return { isBookmarked: !!data };
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
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
  const { showToast } = useToast(); // () 추가

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
        // 북마크 추가 - 타입별로 정확한 데이터 구조 생성
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
        showToast('북마크 처리에 실패했습니다.', 'error');
      }
    },
    onSuccess: (isBookmarked, { type }) => {
      const messages = {
        post: isBookmarked ? '게시글이 북마크에 추가되었습니다.' : '게시글 북마크가 취소되었습니다.',
        study: isBookmarked ? '스터디가 북마크에 추가되었습니다.' : '스터디 북마크가 취소되었습니다.',
        lecture: isBookmarked ? '강의가 찜하기에 추가되었습니다.' : '강의 찜하기가 취소되었습니다.',
      };

      showToast(messages[type], 'success');
      
      // 해당 타입의 북마크 목록 무효화
      queryClient.invalidateQueries({ 
        queryKey: [BOOKMARK_CONFIGS[type].queryPrefix, 'list'] 
      });
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
      if (!user) return { data: [], total: 0 };

      const supabase = createClient();
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // 북마크 목록과 관련 데이터 조회
      const query = supabase
        .from(config.tableName)
        .select(`
          *,
          ${type === 'post' ? 'community_posts(*)' : type === 'study' ? 'studies(*)' : 'lectures(*)'}  
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
      };
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