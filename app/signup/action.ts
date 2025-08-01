import { createClient } from '@/utils/supabase/client';

export async function signup(formData: FormData) {
  const supabase = createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
    nickname: formData.get('nickname') as string,
    interests: JSON.parse(formData.get('interests') as string),
    marketingAgree: formData.get('marketingAgree') === 'true'
  };

  // 1. 사용자 인증 계정 생성
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    }
  });

  if (authError) {
    return { error: authError.message };
  }

  // 2. 프로필 이미지가 있다면 Storage에 업로드
  let avatarUrl = null;
  const avatarFile = formData.get('profileImage') as File;

  if (avatarFile && authData.user) {
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage // data 제거
      .from('avatars')
      .upload(fileName, avatarFile);

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
    } else {
      avatarUrl = fileName; // 파일명만 저장 (userProfileAtom에서 URL 변환)
    }
  }

  // 3. 사용자 프로필 정보 저장
  const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: authData.user!.id,
    name: data.name,
    nickname: data.nickname,
    email: data.email,
    avatar_url: avatarUrl,
    interests: data.interests
  });

  if (profileError) {
    return { error: profileError.message };
  }

  // 4. 마케팅 동의 정보 저장
  const { error: marketingError } = await supabase
    .from('marketing_agreements')
    .insert({
      user_id: authData.user!.id,
      email_agreed: data.marketingAgree,
      agreed_at: data.marketingAgree ? new Date().toISOString() : null
    });

  if (marketingError) {
    return { error: marketingError.message}
  }

  return { error: null };
}