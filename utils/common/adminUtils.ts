import { createClient } from '../supabase/client'

// 관리자 권한 확인 유틸리티
export const checkAdminPermission = async (): Promise<boolean> => {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.');
  }

  return true;
};

// 기본 프로필 타입 정의
export interface BaseProfile {
  id: string;
  avatar_url: string | null;
  [key: string]: unknown;
}

// 아바타 URL 처리 유틸리티
export const processAvatarUrl = async <T extends BaseProfile>(
  profile: T,
  supabase: ReturnType<typeof createClient>
): Promise<T> => {
  let avatarUrl = profile.avatar_url;

  if (avatarUrl) {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarUrl);

    avatarUrl = data.publicUrl;
  }

  return {
    ...profile,
    avatar_url: avatarUrl,
  };
};