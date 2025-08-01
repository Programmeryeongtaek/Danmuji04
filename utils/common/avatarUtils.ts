import { createClient } from '../supabase/client';

export const getAvatarUrl = (avatar_url: string | null | undefined): string | null => {
  // null, undefined, 빈 문자열 체크
  if (!avatar_url || avatar_url.trim() === '') {
    return null;
  }

  // 🆕 추가: 이미 full URL인 경우 유효성 검증 후 반환
  if (avatar_url.startsWith('https://') || avatar_url.startsWith('http://')) {
    try {
      // URL 유효성 검증
      new URL(avatar_url);
      return avatar_url;
    } catch {
      console.warn('Invalid URL detected:', avatar_url);
      return null;
    }
  }

  // 🆕 추가: storage 파일명 유효성 검증
  if (
    avatar_url.length > 200 ||
    avatar_url.includes('..') ||
    avatar_url.startsWith('/')
  ) {
    console.warn('Invalid file name detected:', avatar_url);
    return null;
  }

  try {
    // storage 파일명인 경우 public URL 생성
    const supabase = createClient();
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatar_url);

    const publicUrl = data.publicUrl;

    // 🆕 추가: 생성된 URL 유효성 검증
    if (!publicUrl || publicUrl.trim() === '') {
      console.warn('Empty public URL generated for:', avatar_url);
      return null;
    }

    // 🆕 추가: 최종 URL 유효성 검증
    try {
      new URL(publicUrl);
      return publicUrl;
    } catch {
      console.error('Generated invalid URL:', publicUrl);
      return null;
    }
  } catch {
    console.error('Error generating avatar URL');
    return null;
  }
};

export const handleImageError = (e: React.SyntheticEvent) => {
  const target = e.target as HTMLImageElement;
  // 이미지 로드 실패 시 숨김 처리 (부모 컴포넌트에서 User 아이콘 표시)
  target.style.display = 'none';
};

export const getSafeAvatarUrl = (
  avatar_url: string | null | undefined
): string | null => {
  return getAvatarUrl(avatar_url);
};

// 🆕 추가: Next.js Image 컴포넌트용 안전한 URL 처리
export const getNextSafeImageUrl = (
  avatar_url: string | null | undefined
): string | null => {
  const avatarUrl = getAvatarUrl(avatar_url);

  if (!avatarUrl) {
    return null;
  }

  // Next.js Image 컴포넌트는 절대 URL만 허용
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  // 상대 경로인 경우 null 반환
  console.warn('Relative URL detected for Next.js Image:', avatarUrl);
  return null;
};

// 보안: Supabase Storage 도메인만 허용 (필요시 사용)
export const isAllowedImageDomain = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      'supabase.co',
      'supabase.com',
    ];

    return allowedDomains.some(
      (domain) =>
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

export const isStorageFileName = (fileName: string): boolean => {
  // 기본적인 파일명 검증
  return (
    fileName.length > 0 &&
    fileName.length <= 200 &&
    !fileName.includes('..') &&
    !fileName.startsWith('/') &&
    !fileName.includes('\\')
  );
};

// Supabase Storage에서 안전하게 Public URL 가져오기
export const getStoragePublicUrl = (
  bucketName: string,
  fileName: string
): string | null => {
  if (!isStorageFileName(fileName)) {
    console.warn('Invalid storage file name:', fileName);
    return null;
  }

  try {
    const supabase = createClient();
    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);

    if (!data?.publicUrl) {
      console.warn('No public URL generated for:', fileName);
      return null;
    }

    return data.publicUrl;
  } catch {
    console.error('Error getting storage public URL');
    return null;
  }
};