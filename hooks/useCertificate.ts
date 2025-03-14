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

// 알림 타입 정의
export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_data: any;
  read: boolean;
  created_at: string;
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
      const supabase = createClient();
      
      // 수료증 갱신 로직
      const { error } = await supabase
        .from('certificates')
        .update({
          is_outdated: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificate.id);

      if (error) throw error;
      
      showToast('수료증이 갱신되었습니다.', 'success');
      fetchCertificate();
      return true;
    } catch (error) {
      console.error('수료증 갱신 실패:', error);
      showToast('수료증 갱신에 실패했습니다.', 'error');
      return false;
    }
  }, [certificate, fetchCertificate, showToast]);

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
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
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
          () => {
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

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
}