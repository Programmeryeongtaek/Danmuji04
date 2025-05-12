'use client';

import Button from '@/components/common/Button/Button';
import { atom, useAtom } from 'jotai';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

// Form 상태를 위한 atom
const loginFormAtom = atom({
  email: '',
  password: '',
});

// 에러 상태를 위한 atom
const loginErrorAtom = atom({
  email: '',
  password: '',
});

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

const LoginForm = ({ onSubmit }: LoginFormProps) => {
  const [formData, setFormData] = useAtom(loginFormAtom);
  const [errors, setErrors] = useAtom(loginErrorAtom);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    validateInputs();
  }, [formData]);

  const validateInputs = () => {
    const emailValid: boolean = Boolean(
      formData.email && /\S+@\S+\.\S+/.test(formData.email)
    );
    const passwordValid: boolean = Boolean(
      formData.password && formData.password.length >= 8
    );
    setIsValid(emailValid && passwordValid);
  };

  const validateForm = () => {
    const newErrors = { email: '', password: '' };

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData.email, formData.password);
    } catch (error) {
      console.error('Login failed:', error);
      setErrors((prev) => ({
        ...prev,
        password: '로그인에 실패했습니다. 다시 시도해주세요.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="my-8 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div>
          <input
            type="email"
            placeholder="이메일"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="my-1 h-9 w-full rounded-lg border px-4 py-2 focus:border-gold-start focus:outline-none"
          />
          {errors.email && (
            <span className="text-sm text-red-500">{errors.email}</span>
          )}
        </div>

        <div>
          <input
            type="password"
            placeholder="비밀번호"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="my-1 h-9 w-full rounded-lg border px-4 py-2 focus:border-gold-start focus:outline-none"
          />
          {errors.password && (
            <span className="text-sm text-red-500">{errors.password}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <Button
          type="submit"
          className={`mt-4 w-full py-2 ${!isValid ? 'cursor-not-allowed opacity-50' : ''}`}
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
        </Button>
        <Link href="/signup">
          <Button className="mt-4 w-full py-2">회원가입</Button>
        </Link>
      </div>
    </form>
  );
};

export default LoginForm;
