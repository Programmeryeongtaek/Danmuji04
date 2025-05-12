'use client';

import { useToast } from '@/components/common/Toast/Context';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSupabase from './useSupabase';

export interface NotificationRelatedData {
  [key: string]: unknown;
}

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_data: NotificationRelatedData;
  read: boolean;
  created_at: string;
  pending_delete?: boolean;
  delete_at?: string | null;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessingAutoDelete, setIsProcessingAutoDelete] = useState(false);
  const lastUpdateRef = useRef<number>(Date.now());
  const { showToast } = useToast();
  const { supabase, user } = useSupabase();

  // 알림 목록 가져오기
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    
    // 이전 업데이트로부터 1초도 지나지 않았으면 무시 (무한 루프 방지)
    const now = Date.now();
    if (now - lastUpdateRef.current < 1000) {
      return;
    }
    lastUpdateRef.current = now;

    try {
      setIsLoading(true);

      // 자동 삭제 처리 - 삭제 예정 시간이 지난 알림 처리
      if (!isProcessingAutoDelete) {
        setIsProcessingAutoDelete(true);
        const nowTime = new Date().toISOString();
        
        // 먼저 서버에서 삭제할 알림이 있는지 확인
        const { data: pendingDeleteData } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('pending_delete', true)
          .lt('delete_at', nowTime);
        
        // 삭제할 알림이 있는 경우에만 삭제 작업 수행
        if (pendingDeleteData && pendingDeleteData.length > 0) {
          const { error: deleteError } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id)
            .eq('pending_delete', true)
            .lt('delete_at', nowTime);

          if (deleteError) {
            console.error('자동 삭제 처리 중 오류:', deleteError);
          }
        }
        
        setIsProcessingAutoDelete(false);
      }

      // 알림 목록 조회
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('알림 데이터 조회 오류:', error);
        throw error;
      }
      
      const notificationData = data || [];
      setNotifications(notificationData);
      
      // 읽지 않은 알림 카운트
      const unreadNotifications = notificationData.filter(n => !n.read).length;
      setUnreadCount(unreadNotifications);
        
    } catch (error) {
      console.error('알림 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isProcessingAutoDelete, supabase, user]);

  // 초기 데이터 로드 및 실시간 업데이트 구독
  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // 알림 테이블 변경 구독
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('알림 변경 감지:', payload); 
          fetchNotifications();
        }
      )
      .subscribe();

    // 주기적으로 확인
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current >= 5000) {  // 5초마다 한 번만 실행
        fetchNotifications();
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, supabase, user]);

  // 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId: number) => {
    if (!user) return false;
    
    try {
      // 옵티미스틱 업데이트
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      // 실패 시 데이터 리로드
      fetchNotifications();
      return false;
    }
  }, [fetchNotifications, supabase, user]);

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    if (!user) return false;
    
    try {
      // 옵티미스틱 업데이트
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
      
      showToast('모든 알림을 읽음 처리했습니다.', 'success');
      return true;
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
      showToast('알림 읽음 처리에 실패했습니다.', 'error');
      // 실패 시 데이터 리로드
      fetchNotifications();
      return false;
    }
  }, [fetchNotifications, showToast, supabase, user]);

  // 알림 삭제 기능
 const deleteNotification = useCallback(async (notificationId: number) => {
  if (!user) return false;
  
  try {
    // 옵티미스틱 업데이트
    const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
    
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (wasUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('알림 삭제 실패:', error);
    // 실패 시 데이터 리로드
    fetchNotifications();
    return false;
  }
}, [fetchNotifications, notifications, supabase, user]);

// 모든 알림 삭제
const deleteAllNotifications = useCallback(async () => {
  if (!user) return false;
  
  try {
    // 옵티미스틱 업데이트
    setNotifications([]);
    setUnreadCount(0);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('모든 알림 삭제 실패:', error);
    // 실패 시 데이터 리로드
    fetchNotifications();
    return false;
  }
}, [fetchNotifications, supabase, user]);

// 삭제 예약 (지연 삭제)
const markForDeletion = useCallback(async (notificationId: number, delayMinutes: number = 60) => {
  if (!user) return false;
  
  try {
    // 삭제 예정 시간 계산(기본: 현재로부터 60분 후)
    const deleteAt = new Date();
    deleteAt.setMinutes(deleteAt.getMinutes() + delayMinutes);

    // 옵티미스틱 업데이트
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, pending_delete: true, delete_at: deleteAt.toISOString() } 
          : notif
      )
    );

    const { error } = await supabase
      .from('notifications')
      .update({
        pending_delete: true,
        delete_at: deleteAt.toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('삭제 예약 실패:', error);
    // 실패 시 데이터 리로드
    fetchNotifications();
    return false;
  }
}, [fetchNotifications, supabase, user]);

// 삭제 예약 취소
const cancelDeletion = useCallback(async (notificationId: number) => {
  if (!user) return false;
  
  try {
    // 옵티미스틱 업데이트
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, pending_delete: false, delete_at: null } as Notification 
          : notif
      )
    );
    
    const { error } = await supabase
      .from('notifications')
      .update({
        pending_delete: false,
        delete_at: null
      })
      .eq('id', notificationId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('삭제 예약 취소 실패:', error);
    // 실패 시 데이터 리로드
    fetchNotifications();
    return false;
  }
}, [fetchNotifications, supabase, user]);

return {
  notifications,
  unreadCount,
  isLoading,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  markForDeletion,
  cancelDeletion,
  refresh: fetchNotifications
};
}