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
  console.log('🔍 [isAdminUser] 함수 시작');
  
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  console.log('👤 [isAdminUser] 현재 사용자:', user);
  console.log('👤 [isAdminUser] 사용자 ID:', user?.id);
  console.log('❌ [isAdminUser] 사용자 조회 오류:', userError);

  if (!user) {
    console.log('❌ [isAdminUser] 사용자 없음, false 반환');
    return false;
  }

  console.log('🔍 [isAdminUser] 프로필 조회 시작, 사용자 ID:', user.id);
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log('👤 [isAdminUser] 프로필 데이터:', profile);
  console.log('👤 [isAdminUser] 프로필 role:', profile?.role);
  console.log('❌ [isAdminUser] 프로필 조회 오류:', profileError);

  const isAdmin = profile?.role === 'admin';
  console.log('🔐 [isAdminUser] role === "admin" 비교:', profile?.role, '===', '"admin"', '=', isAdmin);
  console.log('🎯 [isAdminUser] 최종 결과:', isAdmin);

  return isAdmin;
}