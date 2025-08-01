import { QueryClient } from '@tanstack/react-query';

// 에러 타입 정의
interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

// HTTP 에러인지 확인하는 타입 가드
function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && ('status' in error || 'statusCode' in error);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 30 * 60 * 1000, // 30분
      retry: (failureCount, error) => {
        // HTTP 에러 체크
        if (isHttpError(error)) {
          const status = error.status || error.statusCode;
          // 401, 403 에러는 재시도하지 않음
          if (status && [401, 403].includes(status)) {
            return false;
          }
        }
        
        // Supabase 인증 에러 체크
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (message.includes('unauthorized') || message.includes('forbidden')) {
            return false;
          }
        }

        return failureCount < 3;
      },
      refetchOnWindowFocus: false, // 원도우 포커스 시 자동 재조회 비활성화
      refetchOnReconnect: true // 네트워크 재연결 시 재조회 활성화
    },
    mutations: {
      retry: 1 // 뮤테이션은 1번만 재시도
    },
  },
});