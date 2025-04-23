'use client';

import { useToast } from '@/components/common/Toast/Context';
import { CourseCategory } from '@/app/types/course/categories';
import { createClient } from '@/utils/supabase/client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  delete_at?: string | null;
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
  // 자동 삭제 처리 진행 중인지 확인하는 플래그 추가
  const [isProcessingAutoDelete, setIsProcessingAutoDelete] = useState(false);
  // 마지막 알림 데이터 업데이트 시간 추적
  const lastUpdateRef = useRef<number>(Date.now());

  // 알림 목록 가져오기
  const fetchNotifications = useCallback(async () => {
    // 이전 업데이트로부터 1초도 지나지 않았으면 무시 (무한 루프 방지)
    const now = Date.now();
    if (now - lastUpdateRef.current < 1000) {
      return;
    }
    lastUpdateRef.current = now;

    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setNotifications([]);
        return;
      }

      // 자동 삭제 처리 - 삭제 예정 시간이 지난 알림 처리
      // 처리 중일 때는 중복 실행 방지
      if (!isProcessingAutoDelete) {
        setIsProcessingAutoDelete(true);
        const now = new Date().toISOString();
        
        // 먼저 서버에서 삭제할 알림이 있는지 확인
        const { data: pendingDeleteData } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('pending_delete', true)
          .lt('delete_at', now);
        
        // 삭제할 알림이 있는 경우에만 삭제 작업 수행
        if (pendingDeleteData && pendingDeleteData.length > 0) {
          const { error: deleteError } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id)
            .eq('pending_delete', true)
            .lt('delete_at', now);

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
        
      setNotifications(data || []);
    } catch (error) {
      console.error('알림 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isProcessingAutoDelete]);

  // 읽지 않은 알림 개수 조회
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

  // 초기 데이터 로드 및 실시간 업데이트 구독
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    const supabase = createClient();

    async function setupSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
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
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const cleanup = setupSubscription();

    // 주기적으로 확인하는 대신, 5초마다 한 번씩만 확인
    const intervalId = setInterval(() => {
      // 현재 시간과 마지막 업데이트 시간 비교
      const now = Date.now();
      if (now - lastUpdateRef.current >= 5000) {  // 5초마다 한 번만 실행
        fetchNotifications();
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      if (cleanup) cleanup.then(unsub => unsub && unsub());
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // 알림 읽음 처리
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

  // 모든 알림 읽음 처리
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

  // 알림 삭제 기능
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

      return true;
    } catch (error) {
      console.error('알림 삭제 실패:', error);
      return false;
    }
  }, [notifications]);

  // 모든 알림 삭제
  const deleteAllNotifications = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return false;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error('모든 알림 삭제 실패:', error);
      return false;
    }
  }, []);

  // 삭제 예약 (지연 삭제)
  const markForDeletion = useCallback(async (notificationId: number, delayMinutes: number = 60) => {
    try {
      const supabase = createClient();

      // 삭제 예정 시간 계산(기본: 현재로부터 60분 후)
      const deleteAt = new Date();
      deleteAt.setMinutes(deleteAt.getMinutes() + delayMinutes);

      const { error } = await supabase
        .from('notifications')
        .update({
          pending_delete: true,
          delete_at: deleteAt.toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, pending_delete: true, delete_at: deleteAt.toISOString() } 
            : notif
        )
      );

      return true;
    } catch (error) {
      console.error('삭제 예약 실패:', error);
      return false;
    }
  }, []);

  // 삭제 예약 취소
  const cancelDeletion = useCallback(async (notificationId: number) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('notifications')
        .update({
          pending_delete: false,
          delete_at: null
        })
        .eq('id', notificationId);
        
      if (error) throw error;

      // 로컬 상태 업데이트 - 타입 문제 해결
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, pending_delete: false, delete_at: null } as Notification 
            : notif
        )
      );

      return true;
    } catch (error) {
      console.error('삭제 예약 취소 실패:', error);
      return false;
    }
  }, []);

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