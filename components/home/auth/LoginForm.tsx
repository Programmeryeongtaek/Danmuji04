'use client';

import Button from '@/components/common/Button/Button';
import { atom, useAtom } from 'jotai';
import { FormEvent, useState } from 'react';

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

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', password: '' };

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
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
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="email"
          placeholder="이메일"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="my-1 h-9 w-full rounded-lg border pl-3"
        />
        {errors.email && <span>{errors.email}</span>}
      </div>

      <div>
        <input
          type="password"
          placeholder="비밀번호"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="my-1 h-9 w-full rounded-lg border pl-3"
        />
        {errors.password && <span>{errors.password}</span>}
      </div>

      <div>
        <Button type="submit" className="my-2 flex h-9 items-center">
          {isSubmitting ? '로그인 중...' : '로그인'}
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;
