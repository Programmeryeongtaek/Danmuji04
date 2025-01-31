'use server';

import { createClient } from '@/utils/supabase/server';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인 후 이용해주세요.' };
  }

  let avatarUrl = null;
  const avatarFile = formData.get('profileImage') as File;

  // 새 프로필 이미지가 있다면 업로드
  if (avatarFile)  {
    const { data: fileData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(`${user.id}/${Date.now()}`, avatarFile);

    if (uploadError) {
      return { error: uploadError.message };

    }
    avatarUrl = fileData.path;
  }

  // 프로필 정보 업데이트
  const { error: profileError } = await supabase
  .from('profiles')
  .update({
    nickname: formData.get('nickname'),
    interests: JSON.parse(formData.get('interests') as string),
    avatar_url: avatarUrl || undefined,  // 새 이미지가 없으면 기존 이미지 유지
    updated_at: new Date().toISOString()
  })
  .eq('id', user.id);

  if (profileError) {
    return { error: profileError.message };
  }
  
  return { success: true };
}

// 아이디 중복 체크
export async function checkNicknameDuplicate(nickname: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('nickname', nickname)
    .single();

  if (error && error.code === 'PGRST116') {
    // 결과가 없는 경우 = 중복 없음
    return { isDuplicate: false };
  }

  return { isDuplicate: Boolean(data) };
}