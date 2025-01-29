'use client'

import { atom, useAtom } from 'jotai';
import { FormEvent, useRef, useState } from 'react';

// 관심 분야 카테고리 정의
// TODO: 추후에 카테고리 자동으로 업데이트
export const CATEGORIES = [
  '인문학',
  '철학',
  '심리학',
  '경제학',
  '자기계발',
  '리더십'
] as const;

export type Category = typeof CATEGORIES[number];

export interface SignUpFormData {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  nickname: string;
  profileImage: File | null;
  interests: Category[];
  customInterests: string[];
  marketingAgree: boolean,
}

interface SignUpFormErrors {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  customInterest?: string;
}

interface SignUpFormProps {
  onSubmit: (formData: SignUpFormData) => Promise<void>;
}

// Form 상태를 위한 atom
const signUpFormAtom = atom<SignUpFormData>({
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  nickname: '',
  profileImage: null,
  interests: [],
  customInterests: [],
  marketingAgree: false,
});

// 에러 상태를 위한 atom
const signUpErrorAtom = atom<SignUpFormErrors>({
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
});

const useSignUpForm = ({ onSubmit }: SignUpFormProps) => {
  const [formData, setFormData] = useAtom(signUpFormAtom);
  const [errors, setErrors] = useAtom(signUpErrorAtom);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customInterest, setCustomInterest] = useState('');

  const formRef = useRef<HTMLFormElement>(null);

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      email: '',
      password: '',
      passwordConfirm: '',
      name: '',
      customInterest: '',
    };

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
      isValid = false;
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
      isValid = false;
    }

    // 비밀번호 검증 확인
    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요';
      isValid = false;
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
      isValid = false;
    }

    // 이름 검증
    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // 첫 번째 에러가 있는 필드 찾기
      const firstErrorField = formRef.current?.querySelector(
        '[data-error="true"]'
      ) as HTMLElement;
  
      if (firstErrorField) {
        // 부드러운 스크롤로 해당 필드로 이동
        firstErrorField.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
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

  const handleFileChange = (file: File | null) => {
    setFormData((prev) => ({ ...prev, profileImage: file }));
  }

  const toggleInterest = (category: Category) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(category)
        ? prev.interests.filter((c) => c !== category)
        : [...prev.interests, category]
    }));
  };

  const addCustomInterest = () => {
    if (
      customInterest.trim() &&
      !formData.customInterests.includes(customInterest.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        customInterests: [...prev.customInterests, customInterest.trim()],
      }));
      setCustomInterest('');
    }
  }

  const removeCustomInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      customInterests: prev.customInterests.filter((i) => i !== interest),
    }))
  }

  return {
    formData,
    setFormData,
    errors,
    isSubmitting,
    handleSubmit,
    handleFileChange,
    toggleInterest,
    customInterest,
    setCustomInterest,
    addCustomInterest,
    removeCustomInterest,
    formRef,
  };
};

export default useSignUpForm;