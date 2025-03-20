'use client';

import { useToast } from '@/components/common/Toast/Context';
import { CourseCategory } from '@/types/course/categories';
import { createClient } from '@/utils/supabase/client';

import { useCallback, useEffect, useState } from 'react';

export interface Certificate {
  id: number;
  user_id: string;
  category: string;
  issued_at: string;
  updated_at: string | null;
  is_outdated: boolean;
  completed_courses: string[];
}

// 알림 관련 데이터 타입 정의
export interface CourseAddedData {
  category: string;
  course_id: string;
  course_title: string;
}

export interface CertificateData {
  category: string;
}

// 알림 타입에 따른 데이터 타입 정의
export type NotificationRelatedData = CourseAddedData | CertificateData | Record<string, unknown>;

// 알림 타입 상수
export const NOTIFICATION_TYPES = {
  COURSE_ADDED: 'course_added',
  CERTIFICATE_ISSUED: 'certificate_issued',
  CERTIFICATE_UPDATED: 'certificate_updated'
} as const;

// 명확한 알림 타입 정의
export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'course_added' | 'certificate_issued' | 'certificate_updated' | string;
  related_data: NotificationRelatedData;
  read: boolean;
  created_at: string;
  pending_delete?: boolean;
  delete_at?: string;
}

// 특정 카테고리의 수료증 정보를 가져오는 훅
export function useCertificate(category: CourseCategory) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const fetchCertificate = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCertificate(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', category)
        .maybeSingle();
        
      if (error) throw error;
      setCertificate(data);
    } catch (error) {
      console.error('수료증 정보 불러오기 실패:', error);
      showToast('수료증 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [category, showToast]);

  useEffect(() => {
    fetchCertificate();
  }, [fetchCertificate]);

  const refreshCertificate = useCallback(async () => {
    if (!certificate) return false;

    try {
      // 먼저 해당 카테고리의 모든 강의를 완료했는지 확인
      const supabase = createClient();
      
       // 1. 해당 카테고리 모든 강의 ID 가져오기
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('category', category);

      if (!courses || courses.length === 0) {
        showToast('카테고리에 해당하는 강의가 없습니다.', 'error'); 
        return false;
      }

      const courseIds = courses.map(course => course.id);

      // 2. 완료된 강의 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: progress } = await supabase
        .from('course_progress')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('course_id', courseIds);

      const completedCourseIds = progress?.map(p => p.course_id) || [];

      // 3. 모든 강의를 완료했는지 확인
      const allCompleted = courseIds.every(id => completedCourseIds.includes(id));

      if (!allCompleted) {
        showToast('모든 강의를 완료해야 수료증을 갱신할 수 있습니다.', 'error');
        return false;
      }

      // 4. 수료증 갱신
      const { error } = await supabase
        .from('certificates')
        .update({
          is_outdated: false, // 갱신 시 is_outdated를 false로 설정
          updated_at: new Date().toISOString(),
          completed_courses: courseIds // 완료한 코스 ID 목록 업데이트
        })
        .eq('id', certificate.id);

      if (error) throw error;
      
      showToast('수료증이 갱신되었습니다.', 'success');
      fetchCertificate(); // 수료증 정보 다시 불러오기
      return true;
    } catch (error) {
      console.error('수료증 갱신 실패:', error);
      showToast('수료증 갱신에 실패했습니다.', 'error');
      return false;
    }
  }, [certificate, category, fetchCertificate, showToast]);

  return {
    certificate,
    isLoading,
    refreshCertificate,
    fetchCertificate
  };
}

// 모든 수료증 정보를 가져오는 훅
export function useAllCertificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const fetchCertificates = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCertificates([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });
        
      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('수료증 목록 불러오기 실패:', error);
      showToast('수료증 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  return {
    certificates,
    isLoading,
    refetch: fetchCertificates
  };
}

// 알림 관련 훅
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setNotifications([]);
        return;
      }

      console.log('알림 데이터 조회 중:', user.id); // 디버깅 로그
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('알림 데이터 조회 오류:', error);
        throw error;
      }
        
      console.log('알림 데이터 조회 결과:', data?.length, data); // 결과 확인인
      setNotifications(data || []);
    } catch (error) {
      console.error('알림 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUnreadCount(0);
        return;
      }
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('읽지 않은 알림 개수 불러오기 실패:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // 실시간 알림 구독 설정
  useEffect(() => {
    const supabase = createClient();
    
    async function setupSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('알림 구동 설정 중:', user.id); // 디버깅 로그
      
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
            console.log('알림 변경 감지:', payload); // 디버깅 로그
            fetchNotifications();
            fetchUnreadCount();
          }
        )
        .subscribe();

      console.log('구독 상태:', channel.state); // 디버깅 로그
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
    
    const cleanup = setupSubscription();
    return () => {
      if (cleanup) cleanup.then(unsub => unsub && unsub());
    };
  }, [fetchNotifications, fetchUnreadCount]);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
      
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
      showToast('모든 알림을 읽음 처리했습니다.', 'success');
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
      showToast('알림 읽음 처리에 실패했습니다.', 'error');
    }
  }, [showToast]);

  // 알림 삭제 기능 추가
  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // 목록에서 해당 알림 제거
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // 읽지 않은 알림이었다면 카운트 감소
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      showToast('알림이 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('알림 삭제 실패:', error);
      showToast('알림 삭제에 실패했습니다.', 'error');
    }
  }, [notifications, showToast]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };
}