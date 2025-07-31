import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  interests: string[] | null;
  role: 'normal' | 'instructor' | 'manager' | 'admin';
  marketing_agree: boolean;
  created_at: string;
  updated_at: string;
}

// 프로필 상태 atom
const userProfileStateAtom = atom<UserProfile | null>(null);

// 읽기 전용 atom
export const userProfileAtom = atom((get) => get(userProfileStateAtom));

// 아바타 URL 변환 헬퍼 함수
const convertAvatarUrl = (avatar_url: string | null): string | null => {
  if (!avatar_url) return null;

   // 이미 full URL인 경우 그대로 반환
  if (avatar_url.startsWith('https://') || avatar_url.startsWith('http://')) {
    return avatar_url;
  }
  
  // 파일명인 경우 full URL로 변환
  return `https://hcqusfewtyxmpdvzpeor.supabase.co/storage/v1/object/public/avatars/${avatar_url}`;
};

// 프로필 초기화
export const initializeUserProfileAtom = atom(
  null,
  async (get, set, userId: string) => {
    if (!userId) {
      set(userProfileStateAtom, null);
      return;
    }

    try {
      const supabase = createClient();

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('프로필 로드 실패:', error);
        return;
      }

      const processedProfile = {
        ...profile,
        avatar_url: convertAvatarUrl(profile.avatar_url)
      };

      set(userProfileStateAtom, processedProfile);
    } catch (error) {
      console.error('프로필 초기화 실패:', error);
    }
  }
);

// 프로필 업데이트
export const updateUserProfileAtom = atom(
  null,
  async (get, set, updates: Partial<UserProfile>) => {
    const currentProfile = get(userProfileStateAtom);
    if (!currentProfile) return;

    try {
      const supabase = createClient();

      // avatar_url 업데이트 시 원시 파일명으로 DB에 저장
      const dbUpdates = { ...updates };
      if (updates.avatar_url) {
        // Full URL에서 파일명만 추철하여 DB에 저장
        const fileName = updates.avatar_url.split('/').pop();
        dbUpdates.avatar_url = fileName;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentProfile.id)
        .select()
        .single();

      if (error) throw error;

      const processedData = {
        ...data,
        avatar_url: convertAvatarUrl(data.avatar_url)
      };

      set(userProfileStateAtom, processedData);
      return { success: true, data: processedData };
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      return { success: false, error };
    }
  }
);

// 특정 프로필 정보 가져오기 헬퍼
export const getProfileFieldAtom = atom((get) => (field: keyof UserProfile) => {
  const profile = get(userProfileStateAtom);
  return profile ? profile[field] : null;
});

// 관리자 권한 확인
export const isAdminAtom = atom((get) => {
  const profile = get(userProfileStateAtom);
  return profile?.role === 'admin';
});

// 강사 권한 확인
export const isInstructorAtom = atom((get) => {
  const profile = get(userProfileStateAtom);
  return profile?.role === 'instructor' || profile?.role === 'admin' || profile?.role === 'manager';
});

// 로딩 상태 관리를 위한 atom
export const profileLoadingAtom = atom(false);

// 프로필 로딩 상태를 포함한 초기화
export const initializeUserProfileWithLoadingAtom = atom(
  null,
  async (get, set, userId: string) => {
    set(profileLoadingAtom, true);

    try {
      await set(initializeUserProfileAtom, userId);
    } finally {
      set(profileLoadingAtom, false);
    }
  }
);