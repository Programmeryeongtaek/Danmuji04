import { createClient } from '../supabase/client';

export async function getProfileWithAvatar(userId: string) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, nickname, avatar_url')
    .eq('id', userId)
    .single();

  if (!profile) {
    return {
      name: '익명',
      nickname: null,
      avatar_url: null
    };
  }

  // 아바타 URL 생성
  let avatarUrl = null;
  if (profile.avatar_url) {
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(profile.avatar_url);
    avatarUrl = publicUrl;
  }

  return {
    name: profile.nickname || profile.name || '익명',
    nickname: profile.nickname,
    avatar_url: avatarUrl
  };
}