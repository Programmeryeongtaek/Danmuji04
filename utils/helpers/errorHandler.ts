import { PostgrestError } from '@supabase/supabase-js';

// Supabase 에러 또는 일반 에러를 사용자 친화적인 메시지로 변환
export function handleSupabaseError(error: PostgrestError | Error | unknown): string {
  // PostgrestError 타입 확인
  if (isPostgrestError(error)) {
    return `[${error.code}] ${error.message}`;
  }

  // 일반 Error 객체 확인
  if (error instanceof Error) {
    return error.message;
  }

  // 문자열 에러 확인
  if (typeof error === 'string') {
    return error;
  }
  
  // 알 수 없는 에러 형식인 경우
  return '알 수 없는 오류가 발생했습니다.';
}

// 객체가 PostgrestError 타입인지 확인하는 타입 가드
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}