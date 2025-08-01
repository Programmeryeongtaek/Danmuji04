import { Notification, NotificationState } from '@/app/types/notificationTypes';
import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

const notificationStateAtom = atom<NotificationState>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isRealTimeConnected: false,
  lastFetched: null,
});

// 알림 상태 읽기 전용
export const notificationAtom = atom((get) => get(notificationStateAtom));

// 알림 초기화 (로그인 시 호출)
export const initializeNotificationsAtom = atom(
  null,
  async (get, set) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      set(notificationStateAtom, {
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        isRealTimeConnected: false,
        lastFetched: null,
      });
      return;
    }

    set(notificationStateAtom, (prev) => ({ ...prev, isLoading: true }));

    try {
      // 자동 삭제 처리 - 삭제 예정 시간이 지난 알림 처리
      const nowTime = new Date().toISOString();

      const { data: pendingDeleteData } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('pending_delete', true)
        .lt('delete_at', nowTime);

      if (pendingDeleteData && pendingDeleteData.length > 0) {
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .eq('pending_delete', true)
          .lt('delete_at', nowTime);
      }

      // 알림 목록 조회
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      const notificationData = data || [];
      const unreadNotifications = notificationData.filter(n => !n.read).length;

      set(notificationStateAtom, {
        notifications: notificationData,
        unreadCount: unreadNotifications,
        isLoading: false,
        isRealTimeConnected: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error('알림 초기화 실패:', error);
      set(notificationStateAtom, (prev) => ({ ...prev, isLoading: false }));
    }
  }
);

// 실시간 구독 설정
export const subscribeNotificationsAtom = atom(
  null,
  async (get, set) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

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
          const currentState = get(notificationStateAtom);

          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            set(notificationStateAtom, {
              ...currentState,
              notifications: [newNotification, ...currentState.notifications],
              unreadCount: !newNotification.read ? currentState.unreadCount + 1 : currentState.unreadCount,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification;
            const oldNotification = payload.old as Notification;

            set(notificationStateAtom, {
              ...currentState,
              notifications: currentState.notifications.map(n =>
                n.id === updatedNotification.id ? updatedNotification : n
              ),
              unreadCount: !oldNotification.read && updatedNotification.read
                ? currentState.unreadCount - 1
                : oldNotification.read && !updatedNotification.read
                ? currentState.unreadCount + 1
                : currentState.unreadCount,
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedNotification = payload.old as Notification;

            set(notificationStateAtom, {
              ...currentState,
              notifications: currentState.notifications.filter(n => n.id !== deletedNotification.id),
              unreadCount: !deletedNotification.read 
                ? Math.max(0, currentState.unreadCount - 1) 
                : currentState.unreadCount,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set(notificationStateAtom, (prev) => ({ 
            ...prev, 
            isRealTimeConnected: true 
          }));
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          set(notificationStateAtom, (prev) => ({ 
            ...prev, 
            isRealTimeConnected: false 
          }));
        }
      });

    return () => {
      supabase.removeChannel(channel);
      set(notificationStateAtom, (prev) => ({ 
        ...prev, 
        isRealTimeConnected: false 
      }));
    };
  }
);

// 알림 읽음 처리
export const markNotificationAsReadAtom = atom(
  null,
  async (get, set, notificationId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('로그인이 필요합니다.');

    const currentState = get(notificationStateAtom);
    const notification = currentState.notifications.find(n => n.id === notificationId);

    if (!notification || notification.read) return;

    // 낙관적 업데이트
    set(notificationStateAtom, {
      ...currentState,
      notifications: currentState.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, currentState.unreadCount - 1),
    });

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      // 실패 시 롤백
      set(notificationStateAtom, currentState);
      throw error;
    }
  }
);

// 모든 알림 읽음 처리
export const markAllNotificationAsReadAtom = atom(
  null,
  async (get, set) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('로그인이 필요합니다.');

    const currentState = get(notificationStateAtom);

    // 낙관적 업데이트
    set(notificationStateAtom, {
      ...currentState,
      notifications: currentState.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    });

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      // 실패 시 롤백
      set(notificationStateAtom, currentState);
      throw error;
    }
  }
);

// 알림 삭제
export const deleteNotificationAtom = atom(
  null,
  async (get, set, notificationId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('로그인이 필요합니다.');

    const currentState = get(notificationStateAtom);
    const notification = currentState.notifications.find(n => n.id === notificationId);

    if (!notification) return;

    // 낙관적 업데이트
    set(notificationStateAtom, {
      ...currentState,
      notifications: currentState.notifications.filter(n => n.id !== notificationId),
      unreadCount: !notification.read
        ? Math.max(0, currentState.unreadCount - 1)
        : currentState.unreadCount,
    });

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      // 실패 시 롤백
      set(notificationStateAtom, currentState);
      throw error;
    }
  }
);

// 알림 삭제 예약
export const markNotificationForDeletionAtom = atom(
  null,
  async (get, set, notificationId: number, delayMinutes: number = 20) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('로그인이 필요합니다.');

    const deleteTime = new Date();
    deleteTime.setMinutes(deleteTime.getMinutes() + delayMinutes);

    const currentState = get(notificationStateAtom);

    // 낙관적 업데이트
    set(notificationStateAtom, {
      ...currentState,
      notifications: currentState.notifications.map(n =>
        n.id === notificationId
          ? { ...n, pending_delete: true, delete_at: deleteTime.toISOString() }
          : n
      ),
    });

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          pending_delete: true,
          delete_at: deleteTime.toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      // 실패 시 롤백
      set(notificationStateAtom, currentState);
      throw error;
    }
  }
);

// 알림 삭제 예약 취소
export const cancelNotificationDeletionAtom = atom(
  null,
  async (get, set, notificationId: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('로그인이 필요합니다.');

    const currentState = get(notificationStateAtom);

    // 낙관적 업데이트
    set(notificationStateAtom, {
      ...currentState,
      notifications: currentState.notifications.map(n =>
        n.id === notificationId
          ? { ...n, pending_delete: false, delete_at: null }
          : n
      ),
    });

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          pending_delete: false,
          delete_at: null
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      // 실패 시 롤백
      set(notificationStateAtom, currentState);
      throw error;
    }
  }
);