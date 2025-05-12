'use client';

import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function useSupabase() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 클라이언트 인스턴스를 메모이제이션
  const supabase = useMemo(() => createClient(), []);

  // 사용자 정보 가져오기
  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // 컴포넌트 마운트 시 사용자 정보 불러오기
  useEffect(() => {
    fetchUser();

    // 인증 상태 변경 리스너 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUser]);

  return {
    supabase,
    user,
    isLoading,
    refresh: fetchUser
  };
}