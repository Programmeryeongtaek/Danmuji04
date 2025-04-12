import { useToast } from '@/components/common/Toast/Context';
import { Notification } from '@/utils/services/certificateService';
import { createClient } from '@/utils/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useNotificationsRealtime() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mountedRef = useRef(true);
  const { showToast } = useToast();

  // 초기 알림 데이터 가져오기
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      
      // 알림 데이터 조회
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const notificationsData = data || [];
      setNotifications(notificationsData);
      
      // 읽지 않은 알림 카운트 계산
      const unread = notificationsData.filter(n => !n.read).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('알림 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

// 컴포넌트 마운트시 초기 데이터 로드
useEffect(() => {
  fetchNotifications();
}, [fetchNotifications]);

// 컴포넌트 마운트/언마운트 관리
useEffect(() => {
  mountedRef.current = true;
  
  return () => {
    mountedRef.current = false;
  };
}, []);

  // Realtime 구독 설정
  useEffect(() => {
    const supabase = createClient();

    // 사용자 정보 확인 및 채널 설정
    const setupChannel = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
    
        // 이전 채널 정리
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
        }

        console.log('Realtime 채널 설정 시작...');

        const channel = supabase
          .channel('notification-table-changes') // 'realtime' 제외 아무 이름이나 가능
          .on(
            'postgres_changes',
            {
              event: '*', // INSERT, UPDATE, DELETE 모두 구독
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`, // 사용자별 필터링 - 공식문서 필터 방식 사용
            },
            (payload) => {
              console.log('알림 이벤트 수신:', payload);
              
              // 이벤트 유형에 따라 알림 목록 업데이트
              if (payload.eventType === 'INSERT') {
                setNotifications(prev => [payload.new as Notification, ...prev]);
                if (!(payload.new as Notification).read) {
                  setUnreadCount(prev => prev + 1);
                }
              } else if (payload.eventType === 'UPDATE') {
                setNotifications(prev => 
                  prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
                );
                
                // 읽음 처리되었는지 확인하여 카운트 업데이트
                if (
                  !(payload.new as Notification).read !== 
                  !(payload.old as Notification).read
                ) {
                  setUnreadCount(prev => 
                    (payload.new as Notification).read ? prev - 1 : prev + 1
                  );
                }
              } else if (payload.eventType === 'DELETE') {
                console.log('DELETE 이벤트 수신:', payload);
                // UI에서 해당 알림 제거
                setNotifications(prev => 
                  prev.filter(n => n.id !== payload.old.id)
                );
                // 삭제된 알림이 읽지 않은 상태였다면 카운트 감소
                if (!(payload.old as Notification).read) {
                  setUnreadCount(prev => Math.max(0, prev - 1));
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('Realtime 구독 상태:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('알림 실시간 구독 성공');
            } else if (status === 'TIMED_OUT') {
              console.error('실시간 구독 타임아웃 - 재연결 시도 중');
              // 재시도 로직을 여기에 구현할 수 있음
            } else if (status === 'CHANNEL_ERROR') {
              console.error('실시간 구독 채널 오류');
              showToast('실시간 알림 연결에 실패했습니다.', 'error');
            } else if (status === 'CLOSED') {
              console.log('채널이 닫혔습니다.');
            }
          });
          
        channelRef.current = channel;
        return channel;
      } catch (error) {
        console.error('Realtime 채널 설정 오류:', error);
        return null;
      }
    };

    // 채널 설정 호출
    setupChannel();

    // 컴포넌트 언마운트시 채널 정리
    return () => {
      if (channelRef.current) {
        console.log('Realtime 채널 정리...');
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [showToast]); // 의존성 배열에 showToast만 포함

  // 알림 읽음 처리 함수
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const supabase = createClient();
      
      // 옵티미스틱 UI 업데이트
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // 서버 업데이트
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      // 실패 시 UI 롤백
      fetchNotifications();
      return false;
    }
  }, [fetchNotifications]);

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    try {
      const supabase = createClient();
      
      // 옵티미스틱 UI 업데이트
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      // 서버 업데이트
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
      // 실패 시 UI 롤백
      fetchNotifications();
      return false;
    }
  }, [fetchNotifications]);

  // 알림 삭제 예약 (30분 후 삭제)
  const markForDeletion = useCallback(async (notificationId: number, delayMinutes: number = 30) => {
    try {
      const supabase = createClient();
      
      // 삭제 예정 시간 계산
      const deleteTime = new Date();
      deleteTime.setMinutes(deleteTime.getMinutes() + delayMinutes);
      
      // 옵티미스틱 UI 업데이트
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, pending_delete: true, delete_at: deleteTime.toISOString() } 
            : n
        )
      );
      
      // 서버 업데이트
      const { error } = await supabase
        .from('notifications')
        .update({
          pending_delete: true,
          delete_at: deleteTime.toISOString()
        })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('알림 삭제 예약 실패:', error);
      // 실패 시 UI 롤백
      fetchNotifications();
      return false;
    }
  }, [fetchNotifications]);

  // 삭제 예약 취소
  const cancelDeletion = useCallback(async (notificationId: number) => {
    try {
      const supabase = createClient();
      
      // 옵티미스틱 UI 업데이트
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, pending_delete: false, delete_at: null } 
            : n
        )
      );
      
      // 서버 업데이트
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
      console.error('알림 삭제 취소 실패:', error);
      // 실패 시 UI 롤백
      fetchNotifications();
      return false;
    }
  }, [fetchNotifications]);

  // 모든 알림 삭제
  const deleteAllNotifications = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;
      
      // 옵티미스틱 UI 업데이트
      setNotifications([]);
      setUnreadCount(0);
      
      // 서버 업데이트
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('모든 알림 삭제 실패:', error);
      // 실패 시 UI 롤백
      fetchNotifications();
      return false;
    }
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    markForDeletion,
    cancelDeletion,
    deleteAllNotifications,
    refresh: fetchNotifications
  };
}