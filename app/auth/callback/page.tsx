'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect } from 'react';

const AuthCallbackPage = () => {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // URL에서 code 파라미터 가져오기
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (!code) {
          console.error('No code found in URL');
          window.location.href = '/';
          return;
        }

        console.log('Exchanging code for session...');
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('Error exchanging code:', error.message);
          window.location.href = '/error';
          return;
        }

        window.location.href = '/';
      } catch (error) {
        console.error('Error in callback:', error);
        window.location.href = '/error';
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-semibold">인증 처리 중...</h2>
        <p className="text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
