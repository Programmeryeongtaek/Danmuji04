import { requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 읽지 않은 알림 개수를 조회
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error fetching notification count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('알림 개수 조회 실패:', error);
    return 0;
  }
}

// 알림 목록 조회
export async function getNotifications(limit: number = 100, offset: number = 0): Promise<Notification[]> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    const now = new Date().toISOString();

    // 1. 삭제 예정 시간이 지난 알림 자동 삭제
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('pending_delete', true)
      .lt('delete_at', now);

    if (deleteError) {
      console.error('자동 삭제 처리 중 오류:', deleteError);
    }

    // 2. 남은 알림 조회
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('알림 목록 조회 실패:', error);
    return [];
  }
}

// 알림 읽음 처리
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error);
    return false;
  }
}

// 모든 알림 읽음 처리\
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try { 
    const supabase = createClient();
    const user = await requireAuth();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('모든 알림 읽음 처리 실패:', error);
    return false;
  }
}

// 알림 즉시 삭제
export async function deleteNotification(notificationId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('알림 삭제 실패:', error);
    return false;
  }
}

// 알림 삭제 예약 (지연 삭제)
export async function markNotificationForDeletion(notificationId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 삭제 예정 시간 계산(현재로부터 20분 후)
    const deleteAt = new Date();
    deleteAt.setMinutes(deleteAt.getMinutes() + 20);

    const { error } = await supabase
      .from('notifications')
      .update({
        pending_delete: true,
        delete_at: deleteAt.toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking notification for deletion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('알림 삭제 예약 실패:', error);
    return false;
  }
}

// 알림 삭제 예약 취소
export async function cancelNotificationDeletion(notificationId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    const { error } = await supabase
      .from('notifications')
      .update({
        pending_delete: false,
        delete_at: null
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error canceling notification deletion:', error);
      return false;
    } 

    return true;
  } catch (error) {
    console.error('알림 삭제 예약 취소 실패:', error);
    return false;
  }
}