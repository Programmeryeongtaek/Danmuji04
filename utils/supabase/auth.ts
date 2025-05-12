import { User } from '@supabase/supabase-js';
import { createClient } from './client';

// 현재 로그인한 사용자 정보 가져오기
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return null;
  }
}

// 사용자 로그인 필요 여부 확인 및 예외 발생
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }
  return user;
}

// 관리자 권한 여부 확인
export async function isAdminUser(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}