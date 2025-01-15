'use client';

import useSignUpForm from '@/hooks/useSignUpForm';
import { ArrowBigLeft, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const handleSignUp = async (email: string, password: string) => {
    // TODO: Implement signup logic
    console.log('SignUp attempt:', { email, password });
  };

  const { formData, setFormData, errors, isSubmitting, handleSubmit } =
    useSignUpForm(handleSignUp);

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="flex justify-between">
        <div className="flex items-center gap-1">
          <ArrowBigLeft />
          <button>뒤로 가기</button>
        </div>
        <h1 className="mb-8 text-2xl font-bold">회원가입</h1>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm">이메일</label>
          <input
            type="email"
            placeholder="example@inflab.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 p-2"
          />
          {errors.email && (
            <span className="mt-1 text-sm text-red-500">{errors.email}</span>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm">비밀번호</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 p-2"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <span className="mt-1 text-sm text-red-500">{errors.password}</span>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm">비밀번호 확인</label>
          <div className="relative">
            <input
              type={showPasswordConfirm ? 'text' : 'password'}
              value={formData.passwordConfirm}
              onChange={(e) =>
                setFormData({ ...formData, passwordConfirm: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 p-2"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            >
              {showPasswordConfirm ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.passwordConfirm && (
            <span className="mt-1 text-sm text-red-500">
              {errors.passwordConfirm}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-3 text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '가입 중...' : '가입하기'}
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
