'use client'

import { atom, useAtom } from 'jotai';
import { FormEvent, useState } from 'react';

// Form 상태를 위한 atom
const signUpFormAtom = atom({
  email: '',
  password: '',
  passwordConfirm: '',
  marketingAgree: false,
});

// 에러 상태를 위한 atom
const signUpErrorAtom = atom({
  email: '',
  password: '',
  passwordConfirm: '',
});

const useSignUpForm = (
  onSubmit: (email: string, password: string) => Promise<void>
) => {
  const [formData, setFormData] = useAtom(signUpFormAtom);
  const [errors, setErrors] = useAtom(signUpErrorAtom);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      email: '',
      password: '',
      passwordConfirm: '',
    };

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

    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요';
      isValid = false;
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
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
      console.error('SignUp failed:', error);
      setErrors((prev) => ({
        ...prev,
        password: '회원가입에 실패했습니다. 다시 시도해주세요.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    errors,
    isSubmitting,
    handleSubmit,
  };
};

export default useSignUpForm;