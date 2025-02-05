'use client';

import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">인증 오류</h1>
        <p className="mb-6 text-gray-600">
          이메일 인증 과정에서 문제가 발생했습니다.
          <br />
          다시 시도해주시기 바랍니다.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-6 py-2 text-white hover:bg-gradient-to-l"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
