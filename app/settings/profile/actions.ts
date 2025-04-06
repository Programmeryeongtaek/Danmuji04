'use server';

import { createClient } from '@/utils/supabase/server';

export async function updateProfile(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    console.log('업데이트 시작 - 유저:', user);

    if (!user) {
      return { error: '로그인 후 이용해주세요.' };
    }

    const updateData = {
      nickname: formData.get('nickname'),
      interests: JSON.parse(formData.get('interests') as string || '[]'),
      updated_at: new Date().toISOString()
    };

    console.log('업데이트할 데이터:', updateData);

    // update 쿼리 실행 및 결과 가져오기
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select(); // 업데이트된 데이터 반환 요청

    console.log('업데이트 결과:', { data, error: updateError });

    if (updateError) {
      console.error('업데이트 에러:', updateError);
      return { error: updateError.message };
    }

    // 성공 시 업데이트된 데이터 반환
    return { success: true, data };

  } catch (error) {
    console.error('서버 에러:', error);
    return { error: '프로필 업데이트 중 오류가 발생했습니다.' };
  }
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
    return { isDuplicate: false };
  }

  return { isDuplicate: Boolean(data) };
}