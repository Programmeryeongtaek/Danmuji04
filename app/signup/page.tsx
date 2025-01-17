'use client';

import { ArrowBigLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { signup } from './action';
import { FormEvent, useState } from 'react';
import EmailVerifyModal from '@/components/auth/EmailVerifyModal';

const isValidEmail = (email: string) => {
  // RFC 5322 표준을 따르는 이메일 정규식
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
  });

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      passwordConfirm: '',
    };

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다.';
    }

    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요.';
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // 이메일 형식 한번 더 검증
      if (!isValidEmail(formData.email)) {
        setError('올바른 이메일 형식이 아닙니다.');
        return;
      }

      const data = new FormData();
      data.append('email', formData.email);
      data.append('password', formData.password);

      const result = await signup(data);

      if (result?.error) {
        setError(result.error);
        return;
      }

      // 회원가입 성공
      setShowVerifyModal(true);
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.');
      console.error('SignUp error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 이메일 입력 핸들러 - 실시간 유효성 검사
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });

    if (email && !isValidEmail(email)) {
      setErrors((prev) => ({
        ...prev,
        email: '올바른 이메일 형식이 아닙니다.',
      }));
    } else {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  return (
    <>
      <div className="mx-auto max-w-md p-6">
        <div className="flex justify-between">
          <Link href="/?login=true" className="flex items-center gap-1">
            <ArrowBigLeft />
            <button>뒤로 가기</button>
          </Link>
          <h1 className="mb-8 text-2xl font-bold">회원가입</h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm">이메일</label>
            <input
              type="email"
              placeholder="example@inflab.com"
              value={formData.email}
              onChange={handleEmailChange}
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
                minLength={6}
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
              <span className="mt-1 text-sm text-red-500">
                {errors.password}
              </span>
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
                minLength={6}
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

          {error && (
            <div className="text-center text-sm text-red-500">{error}</div>
          )}

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

      <EmailVerifyModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        email={formData.email}
      />
    </>
  );
};

export default SignUpPage;
