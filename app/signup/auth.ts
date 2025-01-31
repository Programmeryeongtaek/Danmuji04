'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect('/error');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  try {
    const supabase = await createClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { error: '이미 등록된 이메일입니다.' };
      }
      return { error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Unknown error:', error);
    return { error: 'An unexpected error occurred'};
  }
}

export async function checkEmailDuplicate(email: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (error && error.code === 'PGRST116') {
      // 결과가 없는 경우 = 중복 없음
      return { isDuplicate: false };
    }

    if (error) throw error;

    return { isDuplicate: Boolean(data) };
  } catch (error) {
    console.error('Email check error:', error);
    return { error: 'Failed to check email' };
  }
}

export async function checkNicknameDuplicate(nickname: string) {
  try {
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
  } catch (error) {
    console.error("Nickname check error:", error);
    return { error: 'Failed to check nickname' };
  }
}