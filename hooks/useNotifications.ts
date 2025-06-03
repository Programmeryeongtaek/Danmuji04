'use client';

import { useToast } from '@/components/common/Toast/Context';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { cancelNotificationDeletionAtom, deleteNotificationAtom, initializeNotificationsAtom, markAllNotificationAsReadAtom, markNotificationAsReadAtom, markNotificationForDeletionAtom, notificationAtom, subscribeNotificationsAtom } from '@/store/notification/notificationAtom';
import { UseNotificationsReturn } from '@/app/types/notificationTypes';

export function useNotifications(): UseNotificationsReturn {
  const notificationState = useAtomValue(notificationAtom);
  const [, initializeNotifications] = useAtom(initializeNotificationsAtom);
  const [, markAsRead] = useAtom(markNotificationAsReadAtom);
  const [, markAllAsRead] = useAtom(markAllNotificationAsReadAtom);
  const [, deleteNotification] = useAtom(deleteNotificationAtom);
  const [, markForDeletion] = useAtom(markNotificationForDeletionAtom);
  const [, cancelDeletion] = useAtom(cancelNotificationDeletionAtom);
  const [, subscribeNotifications] = useAtom(subscribeNotificationsAtom);
  const { showToast } = useToast();

  const {
    notifications,
    unreadCount,
    isLoading,
    isRealTimeConnected
  } = notificationState;

  // 알림 초기화
  const initialize = useCallback(async () => {
    try {
      await initializeNotifications();
    } catch (error) {
      console.error('알림 초기화 실패:', error);
      showToast('알림을 불러오는데 실패했습니다.', 'error');
    }
  }, [initializeNotifications, showToast]);

  // 실시간 구독 시작
  const startRealtimeSubscription = useCallback(async () => {
    try {
      return await subscribeNotifications();
    } catch (error) {
      console.error('실시간 구독 설정 실패:', error);
      showToast('실시간 알림 연결에 실패했습니다.', 'error');
      return null;
    }
  }, [subscribeNotifications, showToast]);

  // 알림 읽음 처리
  const markNotificationAsRead = useCallback(async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      return true;
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      showToast('알림 읽음 처리에 실패했습니다.', 'error');
      return false;
    }
  }, [markAsRead, showToast]);

  // 모든 알림 읽음 처리
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      showToast('모든 알림을 읽음 처리했습니다.', 'success');
      return true;
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
      showToast('알림 읽음 처리에 실패했습니다.', 'error');
      return false;
    }
  }, [markAllAsRead, showToast]);

  // 알림 삭제
  const deleteNotificationById = useCallback(async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      return true;
    } catch (error) {
      console.error('알림 삭제 실패:', error);
      showToast('알림 삭제에 실패했습니다.', 'error');
      return false;
    }
  }, [deleteNotification, showToast]);

  // 알림 삭제 예약
  const markNotificationForDeletion = useCallback(async (notificationId: number, delayMinutes: number = 20) => {
    try {
      await markForDeletion(notificationId, delayMinutes);
      return true;
    } catch (error) {
      console.error('알림 삭제 예약 실패:', error);
      showToast('알림 삭제 예약에 실패했습니다.', 'error');
      return false;
    }
  }, [markForDeletion, showToast]);

  // 알림 삭제 예약 취소
  const cancelNotificationDeletion = useCallback(async (notificationId: number) => {
    try {
      await cancelDeletion(notificationId);
      return true;
    } catch (error) {
      console.error('알림 삭제 예약 취소 실패:', error);
      showToast('알림 삭제 예약 취소에 실패했습니다.', 'error');
      return false;
    }
  }, [cancelDeletion, showToast]);

  return {
    // 상태
    notifications,
    unreadCount,
    isLoading,
    isRealTimeConnected,
    lastFetched: notificationState.lastFetched,
    
    // 액션
    initialize,
    startRealtimeSubscription,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification: deleteNotificationById,
    markNotificationForDeletion,
    cancelNotificationDeletion,
    
    // 편의 메서드
    refresh: initialize,
  };
}