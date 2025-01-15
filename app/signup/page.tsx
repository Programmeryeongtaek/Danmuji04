import { Eye } from 'lucide-react';

const SignUpPage = () => {
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-8 text-2xl font-bold">회원가입</h1>

      <form className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">이메일</label>
          <input
            type="email"
            placeholder="example@inflab.com"
            className="w-full rounded-lg border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">비밀번호</label>
          <div className="relative">
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 p-2"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Eye className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm">비밀번호 확인</label>
          <div className="relative">
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 p-2"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Eye className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-emerald-500 py-3 text-white hover:bg-emerald-600"
        >
          가입하기
        </button>
      </form>

      <div className="relative mt-16 flex h-20 items-center justify-center border-t border-gray-700">
        <span className="absolute -top-3 bg-light px-2 text-gray-700">
          간편 회원가입
        </span>
        <div className="flex gap-3">
          <button className="h-10 w-10 rounded-xl bg-gray-100">간편</button>
          <button className="h-10 w-10 rounded-xl bg-gray-100">간편</button>
          <button className="h-10 w-10 rounded-xl bg-gray-100">간편</button>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
