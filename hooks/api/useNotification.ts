'use client';

import { Notification } from '@/app/types/notificationTypes';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

// 쿼리 키 정의
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (userId: string) => [...notificationKeys.lists(), userId] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unreadCount', userId] as const,
};

// 알림 목록 조회
export const useNotificationsQuery = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: notificationKeys.list(user?.id || ''),
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];

      const supabase = createClient();
      const nowTime = new Date().toISOString();

      // 자동 삭제 처리
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('pending_delete', true)
        .lt('delete_at', nowTime);

      // 알림 목록 조회
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(user),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// 읽지 않은 알림 개수 조회
export const useUnreadCountQuery = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: notificationKeys.unreadCount(user?.id || ''),
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const supabase = createClient();
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      return count || 0;
    },
    enabled: Boolean(user),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// 알림 읽음 처지
export const useMarkAsReadMutation = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number): Promise<void> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async (notificationId: number) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: notificationKeys.list(user.id) });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount(user.id) });

      const previousNotifications = queryClient.getQueryData<Notification[]>(notificationKeys.list(user.id));
      const previousUnreadCount = queryClient.getQueryData<number>(notificationKeys.unreadCount(user.id));

      if (previousNotifications) {
        const updatedNotifications = previousNotifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        queryClient.setQueryData(notificationKeys.list(user.id), updatedNotifications);
      }

      if (previousUnreadCount !== undefined) {
        const targetNotification = previousNotifications?.find(n => n.id === notificationId);
        if (targetNotification && !targetNotification.read) {
          queryClient.setQueryData(notificationKeys.unreadCount(user.id), Math.max(0, previousUnreadCount - 1));
        }
      }

      return { previousNotifications, previousUnreadCount };
    },
    onError: (error, notificationId, context) => {
      if (!user || !context) return;

      queryClient.setQueryData(notificationKeys.list(user.id), context.previousNotifications);
      queryClient.setQueryData(notificationKeys.unreadCount(user.id), context.previousUnreadCount);
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user.id) });
    },
  });
};

// 모든 알림 읽음 처지
export const useMarkAllAsReadMutation = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onMutate: async () => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: notificationKeys.list(user.id) });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount(user.id) });

      const previousNotifications = queryClient.getQueryData<Notification[]>(notificationKeys.list(user.id));
      const previousUnreadCount = queryClient.getQueryData<number>(notificationKeys.unreadCount(user.id));

      if (previousNotifications) {
        const updatedNotifications = previousNotifications.map(n => ({ ...n, read: true }));
        queryClient.setQueryData(notificationKeys.list(user.id), updatedNotifications);
      }

      queryClient.setQueryData(notificationKeys.unreadCount(user.id), 0);

      return { previousNotifications, previousUnreadCount };
    },
    onError: (error, variables, context) => {
      if (!user || !context) return;

      queryClient.setQueryData(notificationKeys.list(user.id), context.previousNotifications);
      queryClient.setQueryData(notificationKeys.unreadCount(user.id), context.previousUnreadCount);
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user.id) });
    },
  });
};

// 알림 삭제
export const useDeleteNotificationMutation = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number): Promise<void> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async (notificationId: number) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: notificationKeys.list(user.id) });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount(user.id) });

      const previousNotifications = queryClient.getQueryData<Notification[]>(notificationKeys.list(user.id));
      const previousUnreadCount = queryClient.getQueryData<number>(notificationKeys.unreadCount(user.id));

      if (previousNotifications) {
        const targetNotification = previousNotifications.find(n => n.id === notificationId);
        const updatedNotifications = previousNotifications.filter(n => n.id !== notificationId);
        queryClient.setQueryData(notificationKeys.list(user.id), updatedNotifications);

        if (targetNotification && !targetNotification.read && previousUnreadCount !== undefined) {
          queryClient.setQueryData(notificationKeys.unreadCount(user.id), Math.max(0, previousUnreadCount - 1));
        }
      }

      return { previousNotifications, previousUnreadCount };
    },
    onError: (error, notificationId, context) => {
      if (!user || !context) return;

      queryClient.setQueryData(notificationKeys.list(user.id), context.previousNotifications);
      queryClient.setQueryData(notificationKeys.unreadCount(user.id), context.previousUnreadCount);
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user.id) });
    },
  });
};

// 알림 삭제 예약
export const useMarkForDeletionMutation = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId, delayMinutes = 20 }: { notificationId: number; delayMinutes?: number }): Promise<void> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const deleteTime = new Date();
      deleteTime.setMinutes(deleteTime.getMinutes() + delayMinutes);

      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({
          pending_delete: true,
          delete_at: deleteTime.toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async ({ notificationId, delayMinutes = 20 }) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: notificationKeys.list(user.id) });

      const previousNotifications = queryClient.getQueryData<Notification[]>(notificationKeys.list(user.id));

      if (previousNotifications) {
        const deleteTime = new Date();
        deleteTime.setMinutes(deleteTime.getMinutes() + delayMinutes);

        const updatedNotifications = previousNotifications.map(n =>
          n.id === notificationId
            ? { ...n, pending_delete: true, delete_at: deleteTime.toISOString() }
            : n
        );
        queryClient.setQueryData(notificationKeys.list(user.id), updatedNotifications);
      }

      return { previousNotifications };
    },
    onError: (error, variables, context) => {
      if (!user || !context) return;
      queryClient.setQueryData(notificationKeys.list(user.id), context.previousNotifications);
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
    },
  });
};

// 알림 삭제 예약 취소
export const useCancelDeletionMutation = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number): Promise<void> => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({
          pending_delete: false,
          delete_at: null
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async (notificationId: number) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: notificationKeys.list(user.id) });

      const previousNotifications = queryClient.getQueryData<Notification[]>(notificationKeys.list(user.id));

      if (previousNotifications) {
        const updatedNotifications = previousNotifications.map(n =>
          n.id === notificationId
            ? { ...n, pending_delete: false, delete_at: null }
            : n
        );
        queryClient.setQueryData(notificationKeys.list(user.id), updatedNotifications);
      }

      return { previousNotifications };
    },
    onError: (error, notificationId, context) => {
      if (!user || !context) return;
      queryClient.setQueryData(notificationKeys.list(user.id), context.previousNotifications);
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
    },
  });
};