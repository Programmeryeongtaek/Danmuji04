'use client';

import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { ChangeEvent, useState } from 'react';
import EmailVerifyModal from '@/components/auth/EmailVerifyModal';
import useSignUpForm, {
  CATEGORIES,
  SignUpFormData,
} from '@/hooks/useSignUpForm';
import Image from 'next/image';
import MarketingAgreementModal from '@/components/auth/MarketingAgreementModal';
import { createClient } from '@/utils/supabase/client';
import Button from '@/components/common/Button/Button';

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showMarketingModal, setShowMarketingModal] = useState(false);

  const {
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
  } = useSignUpForm({
    onSubmit: async (formData: SignUpFormData) => {
      try {
        const supabase = createClient();
        let fileName = '';

        // 1. 이미지 업로드 단계
        if (formData.profileImage) {
          console.log('1. Starting image upload process');
          try {
            const fileExt = formData.profileImage.name.split('.').pop();
            fileName = `user_${Date.now()}.${fileExt}`; // 파일명 형식 변경

            console.log('1.1. Attempting to upload with filename:', fileName);

            // 이미지 업로드
            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, formData.profileImage, {
                cacheControl: '3600',
                upsert: true,
              });

            if (uploadError) {
              console.error('Upload error:', uploadError);
              throw uploadError;
            }

            // 업로드 성공 시 Public URL 확인
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

            console.log(
              '1.2. Image uploaded successfully. Public URL:',
              urlData.publicUrl
            );
          } catch (error) {
            console.error('Image upload error:', error);
            throw error;
          }
        }

        // 2. 회원가입 단계
        console.log('2. Starting signup process with fileName:', fileName);

        const allInterests = [
          ...formData.interests,
          ...formData.customInterests,
        ].join(' ');

        console.log('2.1. Prepared metadata:', {
          name: formData.name,
          nickname: formData.nickname,
          interests: allInterests,
          avatar_url: fileName,
        });

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              name: formData.name,
              nickname: formData.nickname || '',
              interests: allInterests,
              marketing_agree: !!formData.marketingAgree,
              avatar_url: fileName, // 업로드된 파일명
            },
          },
        });

        if (error) {
          console.error('SignUp error:', error);
          throw error;
        }

        if (!data.user?.id) {
          console.error('No user data returned');
          throw new Error('회원가입에 실패했습니다');
        }

        console.log('2.2. Signup successful. User ID:', data.user.id);

        // 3. 최종 확인
        if (fileName) {
          try {
            // 약간의 딜레이를 주어 프로필 생성이 완료되길 기다림
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const { data: profileCheck, error: checkError } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', data.user.id)
              .single();

            console.log('3. Final profile check:', profileCheck);
            if (checkError) {
              // 에러 발생해도 회원가입 프로세스는 계속 진행
              console.log('Profile check error (expected):', checkError);
            }
          } catch (error) {
            // 에러를 throw하지 않고 로그만 남김
            console.log('Profile check failed (expected):', error);
          }
        }

        setShowVerifyModal(true);
      } catch (error) {
        console.error('Final error:', error);
        throw error;
      }
    },
  });

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    handleFileChange(null);
    setImagePreview(null);
    // file input 초기화
    const fileInput = document.getElementById(
      'profileImage'
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <>
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-8 text-2xl font-bold">회원가입</h1>

        <form ref={formRef} className="space-y-6" onSubmit={handleSubmit}>
          {/* 기본 정보 섹션 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">기본 정보</h2>

            {/* 이름 입력 */}
            <div data-error={!!errors.name ? 'true' : 'false'}>
              <label className="mb-1 block text-sm">
                이름<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 p-2 hover:border-gold-start focus:border-gold-start focus:outline-none"
              />
              {errors.name && (
                <span className="mt-1 text-sm text-red-500">{errors.name}</span>
              )}
            </div>
          </div>

          {/* 이메일 입력 */}
          <div data-error={!!errors.email ? 'true' : 'false'}>
            <label className="mb-1 block text-sm">
              이메일<span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 p-2 hover:border-gold-start focus:border-gold-start focus:outline-none"
            />
            {errors.email && (
              <span className="mt-1 text-sm text-red-500">{errors.email}</span>
            )}
          </div>

          {/* 비밀번호 입력 */}
          <div data-error={!!errors.password ? 'true' : 'false'}>
            <label className="mb-1 block text-sm">
              비밀번호<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="8자 이상의 비밀번호를 입력해주세요."
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 p-2 hover:border-gold-start focus:border-gold-start focus:outline-none"
                minLength={8}
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

          {/* 비밀번호 확인 */}
          <div data-error={!!errors.passwordConfirm ? 'true' : 'false'}>
            <label className="mb-1 block text-sm">
              비밀번호 확인<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                placeholder="설정한 비밀번호와 동일하게 입력해주세요."
                value={formData.passwordConfirm}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    passwordConfirm: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 p-2 hover:border-gold-start focus:border-gold-start focus:outline-none"
                minLength={8}
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

          {/* 프로필 정보 섹션 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">추가 정보</h2>

            {/* 닉네임 입력 */}
            <div>
              <label className="mb-1 block text-sm">닉네임</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nickname: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 p-2 hover:border-gold-start focus:border-gold-start focus:outline-none"
                placeholder="선택사항"
              />
            </div>

            {/* 프로필 이미지 업로드 */}
            <div>
              <label className="mb-1 block text-sm">프로필 이미지</label>
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 overflow-hidden rounded-full border border-gray-300">
                  {imagePreview ? (
                    <>
                      <Image
                        src={imagePreview}
                        alt="Profile preview"
                        width={200}
                        height={200}
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-50">
                      <span className="text-sm text-gray-400">No image</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="profile-image"
                />
                <label
                  htmlFor="profile-image"
                  className="cursor-pointer rounded-lg border bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:border-gold-start hover:bg-white"
                >
                  이미지 선택
                </label>
              </div>
            </div>

            {/* 관심 분야 */}
            <div className="space-y-2">
              <label className="mb-1 block text-sm">관심 분야</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleInterest(category)}
                    className={`rounded-lg border p-2 text-sm transition-colors ${
                      formData.interests.includes(category)
                        ? 'border-gold-start bg-gold-end/10 text-gold-start'
                        : 'border-gray-300 hover:border-gold-end'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* 기타 관심 분야 입력 */}
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    placeholder="기타 관심 분야 입력"
                    className="flex-1 rounded-lg border border-gray-300 p-2 text-sm hover:border-gold-start focus:border-gold-start"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomInterest();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomInterest}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:border-gold-end"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {/* 추가된 커스텀 관심 분야 */}
                <div className="flex flex-wrap gap-2">
                  {formData.customInterests.map((interest) => (
                    <span
                      key={interest}
                      className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeCustomInterest(interest)}
                        className="rounded-full hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 마케팅 동의 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">마케팅 정보 수신 동의</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.marketingAgree}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      marketingAgree: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  마케팅 정보 수신 동의 (선택)
                </span>
              </label>
              <div className="ml-6 space-y-2">
                <p className="text-sm text-gray-600">
                  단무지의 새로운 스터디와 모임 소식,
                  <br />
                  관심 분야에 맞는 맞춤 콘텐츠 추천을 받아보실 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={() => setShowMarketingModal(true)}
                  className="text-sm text-gray-500 underline hover:text-gray-700"
                >
                  자세히 보기
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-lg py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '가입 중...' : '가입하기'}
          </Button>
        </form>
      </div>

      <EmailVerifyModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        email={formData.email}
      />

      {/* 마케팅 동의 모달 */}
      <MarketingAgreementModal
        isOpen={showMarketingModal}
        onClose={() => setShowMarketingModal(false)}
        formData={formData}
        onAgree={(agreed) =>
          setFormData((prev) => ({ ...prev, marketingAgree: agreed }))
        }
      />
    </>
  );
};

export default SignUpPage;
