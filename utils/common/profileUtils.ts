import { createClient } from '../supabase/client';
import { getAvatarUrl } from './avatarUtils';

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
  const avatarUrl = getAvatarUrl(profile.avatar_url);

  return {
    name: profile.nickname || profile.name || '익명',
    nickname: profile.nickname,
    avatar_url: avatarUrl
  };
}