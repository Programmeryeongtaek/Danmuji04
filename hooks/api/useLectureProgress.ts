import { LectureProgress, LectureProgressResponse, LectureProgressStats, LectureProgressUpdate, MarkItemCompletedParams, ResetProgressParams, UpdateLastWatchedParams } from '@/app/types/lecture/progress';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

// 쿼리 키 정의
export const lectureProgressKeys = {
  all: ['lectureProgress'] as const,
  lists: () => [...lectureProgressKeys.all, 'list'] as const,
  list: (userId: string) => [...lectureProgressKeys.lists(), userId] as const,
  details: () => [...lectureProgressKeys.all, 'detail'] as const,
  detail: (lectureId: number, userId: string) => [
    ...lectureProgressKeys.details(),
    lectureId,
    userId,
  ] as const,
  stats: (userId: string) => [...lectureProgressKeys.all, 'stats', userId] as const,
};

// API 함수들
const transformProgressResponse = (data: LectureProgressResponse): LectureProgress => ({
  lectureId: data.lecture_id,
  userId: data.user_id,
  completedItems: data.completed_items || [],
  totalItems: data.total_items || 0,
  progressPercentage: data.progress_percentage || 0,
  lastWatchedAt: data.last_watched_at || '',
  lastWatchedItemId: data.last_watched_item_id || null,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

const fetchAllLectureProgress = async (userId: string): Promise<Record<number, LectureProgress>> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('lecture_progress')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const progressMap: Record<number, LectureProgress> = {};

  data?.forEach((item) => {
    progressMap[item.lectrue_id] = transformProgressResponse(item);
  });

  return progressMap;
};

const fetchLectureProgress = async (
  lectureId: number,
  userId: string
): Promise<LectureProgress | null> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('lecture_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lecture_id', lectureId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 데이터 없음
      return null;
    }
    throw error;
  }

  return transformProgressResponse(data);
};

const updateLectureProgress = async (
  lectureId: number,
  userId: string,
  updates: LectureProgressUpdate
): Promise<LectureProgress> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('lecture_progress')
    .upsert({
      user_id: userId,
      lecture_id: lectureId,
      completed_items: updates.completedItems,
      total_items: updates.totalItems,
      progress_percentage: updates.progressPercentage,
      last_watched_at: updates.lastWatchedAt,
      last_watched_item_id: updates.lastWatchedItemId,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return transformProgressResponse(data);
};

const calculateProgressStats = (progressMap: Record<number, LectureProgress>): LectureProgressStats => {
  const lectures = Object.values(progressMap);
  const lectureCount = lectures.length;
  let totalItems = 0;
  let completedItems = 0;
  let completedLectures = 0;
  
  lectures.forEach((progress) => {
    totalItems += progress.totalItems;
    completedItems += progress.completedItems.length;
    
    if (progress.totalItems > 0 && progress.completedItems.length === progress.totalItems) {
      completedLectures++;
    }
  });
  
  const overallPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  return {
    lectureCount,
    completedLectures,
    totalItems,
    completedItems,
    overallPercentage,
  };
};

export const useAllLectureProgress = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: lectureProgressKeys.list(user?.id || ''),
    queryFn: () => fetchAllLectureProgress(user!.id),
    enabled: Boolean(user),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useLectureProgress = (lectureId: number) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: lectureProgressKeys.detail(lectureId, user?.id || ''),
    queryFn: () => fetchLectureProgress(lectureId, user!.id),
    enabled: Boolean(user && lectureId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useLectureProgressStats = () => {
  const user = useAtomValue(userAtom);
  const { data: progressMap = {} } = useAllLectureProgress();

  return useQuery({
    queryKey: lectureProgressKeys.stats(user?.id || ''),
    queryFn: () => calculateProgressStats(progressMap),
    enabled: Boolean(user && Object.keys(progressMap).length > 0),
    staleTime: 60 * 1000,
  });
};

export const useMarkItemCompleted = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lectureId, itemId }: MarkItemCompletedParams) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      // 현재 진도 조회
      const currentProgress = await fetchLectureProgress(lectureId, user.id);
      
      if (!currentProgress) {
        // 진도 정보가 없으면 섹션 정보를 조회하여 totalItems 계산
        const supabase = createClient();
        const { data: sectionsData, error } = await supabase
          .from('lecture_sections')
          .select('lecture_items(id)')
          .eq('lecture_id', lectureId);

        if (error) throw error;

        const totalItems = sectionsData?.reduce((total, section) => {
          return total + (section.lecture_items?.length || 0);
        }, 0) || 0;

        const newCompletedItems = [itemId];
        const newProgressPercentage = totalItems > 0 ? Math.round((newCompletedItems.length / totalItems) * 100) : 0;

        return updateLectureProgress(lectureId, user.id, {
          completedItems: newCompletedItems,
          totalItems,
          progressPercentage: newProgressPercentage,
          lastWatchedAt: new Date().toISOString(),
          lastWatchedItemId: itemId,
        });
      }

      // 이미 완료된 아이템인지 확인
      if (currentProgress.completedItems.includes(itemId)) {
        return currentProgress;
      }

      // 새로운 완료 아이템 추가
      const newCompletedItems = [...currentProgress.completedItems, itemId];
      const newProgressPercentage = currentProgress.totalItems > 0 
        ? Math.round((newCompletedItems.length / currentProgress.totalItems) * 100) 
        : 0;

      return updateLectureProgress(lectureId, user.id, {
        completedItems: newCompletedItems,
        totalItems: currentProgress.totalItems,
        progressPercentage: newProgressPercentage,
        lastWatchedAt: new Date().toISOString(),
        lastWatchedItemId: itemId,
      });
    },
    onMutate: async ({ lectureId, itemId }) => {
      if (!user) return;

      // 관련 쿼리 취소
      await queryClient.cancelQueries({
        queryKey: lectureProgressKeys.detail(lectureId, user.id),
      });
      await queryClient.cancelQueries({
        queryKey: lectureProgressKeys.list(user.id),
      });

      // 이전 데이터 스냅샷
      const previousProgress = queryClient.getQueryData<LectureProgress | null>(
        lectureProgressKeys.detail(lectureId, user.id)
      );
      const previousAllProgress = queryClient.getQueryData<Record<number, LectureProgress>>(
        lectureProgressKeys.list(user.id)
      );

      // Optimistic update
      if (previousProgress && !previousProgress.completedItems.includes(itemId)) {
        const newCompletedItems = [...previousProgress.completedItems, itemId];
        const newProgressPercentage = previousProgress.totalItems > 0 
          ? Math.round((newCompletedItems.length / previousProgress.totalItems) * 100) 
          : 0;

        const optimisticProgress: LectureProgress = {
          ...previousProgress,
          completedItems: newCompletedItems,
          progressPercentage: newProgressPercentage,
          lastWatchedAt: new Date().toISOString(),
          lastWatchedItemId: itemId,
        };

        // 개별 진도 업데이트
        queryClient.setQueryData(
          lectureProgressKeys.detail(lectureId, user.id),
          optimisticProgress
        );

        // 전체 진도 맵 업데이트
        if (previousAllProgress) {
          queryClient.setQueryData(
            lectureProgressKeys.list(user.id),
            {
              ...previousAllProgress,
              [lectureId]: optimisticProgress,
            }
          );
        }
      }

      return { previousProgress, previousAllProgress };
    },
    onError: (error, { lectureId }, context) => {
      if (!user || !context) return;

      // 에러 시 이전 상태로 롤백
      if (context.previousProgress) {
        queryClient.setQueryData(
          lectureProgressKeys.detail(lectureId, user.id),
          context.previousProgress
        );
      }
      if (context.previousAllProgress) {
        queryClient.setQueryData(
          lectureProgressKeys.list(user.id),
          context.previousAllProgress
        );
      }
    },
    onSettled: (data, error, { lectureId }) => {
      if (!user) return;

      // 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: lectureProgressKeys.detail(lectureId, user.id),
      });
      queryClient.invalidateQueries({
        queryKey: lectureProgressKeys.list(user.id),
      });
      queryClient.invalidateQueries({
        queryKey: lectureProgressKeys.stats(user.id),
      });
    },
  });
};

export const useUpdateLastWatched = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lectureId, itemId }: UpdateLastWatchedParams) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const currentProgress = await fetchLectureProgress(lectureId, user.id);

      if (!currentProgress) {
        // 진도 정보가 없으면 기본 진도 생성
        const supabase = createClient();
        const { data: sectionsData, error } = await supabase
          .from('lecture_sections')
          .select('lecture_items(id)')
          .eq('lecture_id', lectureId);

        if (error) throw error;

        const totalItems = sectionsData?.reduce((total, section) => {
          return total + (section.lecture_items?.length || 0);
        }, 0) || 0;

        return updateLectureProgress(lectureId, user.id, {
          completedItems: [],
          totalItems,
          progressPercentage: 0,
          lastWatchedAt: new Date().toISOString(),
          lastWatchedItemId: itemId,
        });
      }

      return updateLectureProgress(lectureId, user.id, {
        completedItems: currentProgress.completedItems,
        totalItems: currentProgress.totalItems,
        progressPercentage: currentProgress.progressPercentage,
        lastWatchedAt: new Date().toISOString(),
        lastWatchedItemId: itemId,
      });
    },
    onSettled: (data, error, { lectureId }) => {
      if (!user) return;

      // 실패해도 UI는 유지 (UX 고려)
      queryClient.invalidateQueries({
        queryKey: lectureProgressKeys.detail(lectureId, user.id),
      });
    },
  });
};

export const useResetLectureProgress = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lectureId }: ResetProgressParams) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const currentProgress = await fetchLectureProgress(lectureId, user.id);

      if (!currentProgress) {
        return null;
      }

      return updateLectureProgress(lectureId, user.id, {
        completedItems: [],
        totalItems: currentProgress.totalItems,
        progressPercentage: 0,
        lastWatchedAt: new Date().toISOString(),
        lastWatchedItemId: null,
      });
    },
    onMutate: async ({ lectureId }) => {
      if (!user) return;

      await queryClient.cancelQueries({
        queryKey: lectureProgressKeys.detail(lectureId, user.id),
      });

      const previousProgress = queryClient.getQueryData<LectureProgress | null>(
        lectureProgressKeys.detail(lectureId, user.id)
      );

      if (previousProgress) {
        const resetProgress: LectureProgress = {
          ...previousProgress,
          completedItems: [],
          progressPercentage: 0,
          lastWatchedAt: new Date().toISOString(),
          lastWatchedItemId: null,
        };

        queryClient.setQueryData(
          lectureProgressKeys.detail(lectureId, user.id),
          resetProgress
        );
      }

      return { previousProgress };
    },
    onError: (error, { lectureId }, context) => {
      if (!user || !context?.previousProgress) return;

      queryClient.setQueryData(
        lectureProgressKeys.detail(lectureId, user.id),
        context.previousProgress
      );
    },
    onSettled: (data, error, { lectureId }) => {
      if (!user) return;

      queryClient.invalidateQueries({
        queryKey: lectureProgressKeys.detail(lectureId, user.id),
      });
      queryClient.invalidateQueries({
        queryKey: lectureProgressKeys.list(user.id),
      });
      queryClient.invalidateQueries({
        queryKey: lectureProgressKeys.stats(user.id),
      });
    },
  });
};

// 헬퍼 함수들
export const useIsItemCompleted = (lectureId: number, itemId: number) => {
  const { data: progress } = useLectureProgress(lectureId);
  return progress?.completedItems.includes(itemId) || false;
};

export const useIsLectureCompleted = (lectureId: number) => {
  const { data: progress } = useLectureProgress(lectureId);
  
  if (!progress || progress.totalItems === 0) return false;
  return progress.completedItems.length === progress.totalItems;
};

export const useNextItemToWatch = (lectureId: number, allItemIds: number[]) => {
  const { data: progress } = useLectureProgress(lectureId);
  
  if (!progress) return allItemIds[0] || null;
  
  // 마지막 시청 아이템이 있으면 그 다음 아이템
  if (progress.lastWatchedItemId) {
    const lastIndex = allItemIds.indexOf(progress.lastWatchedItemId);
    if (lastIndex !== -1 && lastIndex < allItemIds.length - 1) {
      return allItemIds[lastIndex + 1];
    }
  }
  
  // 완료되지 않은 첫 번째 아이템
  const nextItem = allItemIds.find(itemId => !progress.completedItems.includes(itemId));
  return nextItem || null;
};