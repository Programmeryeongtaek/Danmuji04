'use client'

import { checkEmailDuplicate, checkNicknameDuplicate } from '@/app/signup/auth';
import { atom, useAtom } from 'jotai';
import { FormEvent, useCallback, useRef, useState } from 'react';

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
  nickname?: string;
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
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const checkEmail = useCallback(async (email: string) => {
    if (!email) return false;

    setIsCheckingEmail(true);
    const { isDuplicate, error } = await checkEmailDuplicate(email);
    setIsCheckingEmail(false);

    if (error) {
      setErrors(prev => ({ ...prev, email: '이메일 확인 중 오류가 발생했습니다.' }));
      return false;
    }

    if (isDuplicate) {
      setErrors(prev => ({ ...prev, email: '이미 사용 중인 이메일입니다.' }));
      return false;
    }

    setErrors(prev => ({ ...prev, email: '' }));
    return true;
  }, [setErrors]);

  const checkNickname = useCallback(async (nickname: string) => {
    if (!nickname) return false;

    setIsCheckingNickname(true);
    const { isDuplicate, error } = await checkNicknameDuplicate(nickname);
    setIsCheckingNickname(false);

    if (error) {
      setErrors(prev => ({ ...prev, nickname: '닉네임 확인 중 오류가 발생했습니다.' }));
      return false;
    }

    if (isDuplicate) {
      setErrors(prev => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다.' }));
      return false;
    }

    setErrors(prev => ({ ...prev, nickname: '' }));
    return true;
  }, [setErrors]);


  const validateForm = useCallback(async () => {
    let isValid = true;
    const newErrors: SignUpFormErrors = {
      email: '',
      password: '',
      passwordConfirm: '',
      name: '',
      nickname: '',
    };

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
      isValid = false;
    } else {
      const emailValid = await checkEmail(formData.email);
      if (!emailValid) isValid = false;
    }

    // 닉네임 검증 (선택사항이지만, 입력된 경우 중복 체크)
    if (formData.nickname) {
      const nicknameValid = await checkNickname(formData.nickname);
      if (!nicknameValid) isValid = false;
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
  }, [checkEmail, checkNickname, formData, setErrors]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isCheckingEmail || isCheckingNickname) return;
  
    const isValid = await validateForm();
    if (!isValid) {
      const firstErrorField = formRef.current?.querySelector('[data-error="true"]') as HTMLElement;
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  
    if (isSubmitting) return;
  
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error: unknown) {
      const err = error as { message: string };
      if (err.message.includes('already registered')) {
        setErrors(prev => ({ ...prev, email: '이미 등록된 이메일입니다.' }));
      } else {
        setErrors(prev => ({
          ...prev,
          email: '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        }));
      }
    } finally {
      setTimeout(() => setIsSubmitting(false), 6000);
    }
  };

  const handleFileChange = useCallback((file: File | null) => {
    setFormData((prev) => ({ ...prev, profileImage: file }));
  }, [setFormData]);

  const toggleInterest = useCallback((category: Category) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(category)
        ? prev.interests.filter((c) => c !== category)
        : [...prev.interests, category]
    }));
  }, [setFormData]);

  const addCustomInterest = useCallback(() => {
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
  }, [customInterest, formData.customInterests, setFormData]);

  const removeCustomInterest = useCallback((interest: string) => {
    setFormData((prev) => ({
      ...prev,
      customInterests: prev.customInterests.filter((i) => i !== interest),
    }));
  }, [setFormData]);

  return {
    formData,
    setFormData,
    errors,
    isSubmitting,
    isCheckingEmail,
    isCheckingNickname,
    handleSubmit,
    handleFileChange,
    toggleInterest,
    customInterest,
    setCustomInterest,
    addCustomInterest,
    removeCustomInterest,
    formRef,
    checkEmail,
    checkNickname
  };
};

export default useSignUpForm;