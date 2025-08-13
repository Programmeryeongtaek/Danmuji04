'use client';

import { useToast } from '@/components/common/Toast/Context';
import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { UseNotificationsReturn } from '@/app/types/notificationTypes';
import { userAtom } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notificationKeys, useCancelDeletionMutation, useDeleteNotificationMutation, useMarkAllAsReadMutation, useMarkAsReadMutation, useMarkForDeletionMutation, useNotificationsQuery, useUnreadCountQuery } from './api/useNotification';
import { createClient } from '@/utils/supabase/client';

export function useNotifications(): UseNotificationsReturn {
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // TanStack Query 훅들
  const { data: notifications = [], isLoading, refetch } = useNotificationsQuery();
  const { data: unreadCount = 0 } = useUnreadCountQuery();

  // Mutation 훅들
  const markAsReadMutation = useMarkAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();
  const deleteNotificationMutation = useDeleteNotificationMutation();
  const markForDeletionMutation = useMarkForDeletionMutation();
  const cancelDeletionMutation = useCancelDeletionMutation();

  // 실시간 구독 설정
  useEffect(() => {
    if (!user) return;

    // 이전 채널 정리
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
    }

    const supabase = createClient();
    const channel = supabase
      .channel('notification-table-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('알림 이벤트 수신:', payload);

          // 모든 관련 쿼리 무효화하여 최신 데이터 다시 가져오기
          queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
          queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user.id) });
        }
      )
      .subscribe((status) => {
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          showToast('실시간 알림 연결에 실패했습니다.', 'error');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, showToast]);

  // 초기화 함수
  const initialize = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('알림 초기화 실패:', error);
      showToast('알림을 불러오는데 실패했습니다.', 'error');
    }
  }, [refetch, showToast]);

  // 실시간 구독 시작 (이미 useEffect에서 처리되므로 더미 함수)
  const startRealtimeSubscription = useCallback(async () => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // 알림 읽음 처리
  const markNotificationAsRead = useCallback(async (notificationId: number): Promise<boolean> => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
      return true;
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      showToast('알림 읽음 처리에 실패했습니다.', 'error');
      return false;
    }
  }, [markAsReadMutation, showToast]);

  // 모든 알림 읽음 처리
  const markAllNotificationsAsRead = useCallback(async (): Promise<boolean> => {
    try {
      await markAllAsReadMutation.mutateAsync();
      showToast('모든 알림을 읽음 처리했습니다.', 'success');
      return true;
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
      showToast('알림 읽음 처리에 실패했습니다.', 'error');
      return false;
    }
  }, [markAllAsReadMutation, showToast]);

  // 알림 삭제
  const deleteNotification = useCallback(async (notificationId: number): Promise<boolean> => {
    try {
      await deleteNotificationMutation.mutateAsync(notificationId);
      return true;
    } catch (error) {
      console.error('알림 삭제 실패:', error);
      showToast('알림 삭제에 실패했습니다.', 'error');
      return false;
    }
  }, [deleteNotificationMutation, showToast]);

  // 알림 삭제 예약
  const markNotificationForDeletion = useCallback(async (notificationId: number, delayMinutes: number = 20): Promise<boolean> => {
    try {
      await markForDeletionMutation.mutateAsync({ notificationId, delayMinutes });
      return true;
    } catch (error) {
      console.error('알림 삭제 예약 실패:', error);
      showToast('알림 삭제 예약에 실패했습니다.', 'error');
      return false;
    }
  }, [markForDeletionMutation, showToast]);

  // 알림 삭제 예약 취소
  const cancelNotificationDeletion = useCallback(async (notificationId: number): Promise<boolean> => {
    try {
      await cancelDeletionMutation.mutateAsync(notificationId);
      return true;
    } catch (error) {
      console.error('알림 삭제 예약 취소 실패:', error);
      showToast('알림 삭제 예약 취소에 실패했습니다.', 'error');
      return false;
    }
  }, [cancelDeletionMutation, showToast]);

  return {
    // 상태
    notifications,
    unreadCount,
    isLoading,
    isRealTimeConnected: true, // 실시간 연결 상태는 단순화
    lastFetched: Date.now(),

    // 액션
    initialize,
    startRealtimeSubscription,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    markNotificationForDeletion,
    cancelNotificationDeletion,

    // 편의 메서드
    refresh: initialize,
  };
}