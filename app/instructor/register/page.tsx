'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import { CheckCircle, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

// 전문 분야 옵션 정의
const SPECIALTY_OPTIONS = [
  { value: 'humanities', label: '인문학' },
  { value: 'philosophy', label: '철학' },
  { value: 'psychology', label: '심리학' },
  { value: 'economics', label: '경제학' },
  { value: 'self-development', label: '자기계발' },
  { value: 'leadership', label: '리더십' },
  { value: 'other', label: '기타 (직접 입력)' },
];

export default function InstructorRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [experience, setExperience] = useState('');
  const [motivation, setMotivation] = useState('');
  const [socialLinks, setSocialLinks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 이미지 첨부 관련 상태
  const [certificateImage, setCertificateImage] = useState<File | null>(null);
  const [certificatePreview, setCertificatePreview] = useState<string | null>(
    null
  );

  const { showToast } = useToast();
  const router = useRouter();
  const user = useAtomValue(userAtom);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

      if (data) {
        setName(data.name || '');
        setEmail(data.email || user.email || '');
      }
    };

    loadUserData();
  }, [user]);

  // 이미지 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 타입 체크
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.', 'error');
      return;
    }

    // 5MB 이하 체크
    if (file.size > 5 * 1024 * 1024) {
      showToast('5MB 이하의 이미지만 업로드 가능합니다.', 'error');
      return;
    }

    setCertificateImage(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setCertificatePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
      return;
    }

    // 필수 필드 검증
    if (!name || !email || !phoneNumber || !experience || !motivation) {
      showToast('모든 필수 항목을 입력해주세요.', 'error');
      return;
    }

    // 전문 분야 검증 (specialty 또는 customSpecialty 중 하나는 필수)
    const finalSpecialty = specialty === 'other' ? customSpecialty : specialty;

    if (!finalSpecialty) {
      showToast('전문 분야를 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 이미지 업로드 (있는 경우)
      let certificateUrl = null;
      if (certificateImage) {
        const fileExt = certificateImage.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `instructor-certificates/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('instructor-docs')
          .upload(filePath, certificateImage);

        if (uploadError) throw uploadError;

        // 파일 URL 가져오기
        const { data: publicUrl } = supabase.storage
          .from('instructor-docs')
          .getPublicUrl(filePath);

        certificateUrl = publicUrl.publicUrl;
      }

      // 강사 신청 정보 저장
      const { data: application, error } = await supabase
        .from('instructor_applications')
        .insert({
          user_id: user.id,
          name,
          email,
          phone_number: phoneNumber,
          specialty: finalSpecialty,
          experience,
          motivation,
          social_links: socialLinks,
          certificate_url: certificateUrl,
          status: 'pending', // 관리자 승인 대기 상태
        })
        .select('id')
        .single();

      if (error) throw error;

      // 관리자에게 알림 생성
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        // 각 관리자에게 알림 생성
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          title: '새로운 강사 신청',
          message: `${name}님이 강사 등록을 신청했습니다.`,
          type: 'instructor_application',
          related_data: { application_id: application.id },
          read: false,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setIsSubmitted(true);
      showToast('강사 등록 신청이 완료되었습니다.', 'success');
    } catch (error) {
      console.error('Error submitting instructor application:', error);
      showToast('제출 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold">신청이 완료되었습니다!</h1>
          <p className="mb-6 text-gray-600">
            강사 신청이 접수되었습니다. 검토 후 이메일로 결과를
            알려드리겠습니다.
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-6 py-2 text-white transition hover:bg-gradient-to-l"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">강사 등록</h1>
        <p className="text-gray-600">강사님의 지식과 경험을 나누어 주세요.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="name" className="mb-1 block font-medium">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block font-medium">
            이메일 <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            required
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="mb-1 block font-medium">
            연락처 <span className="text-red-500">*</span>
          </label>
          <input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="010-000-0000"
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            required
          />
        </div>

        <div>
          <label htmlFor="specialty" className="mb-1 block font-medium">
            전문 분야 <span className="text-red-500">*</span>
          </label>
          <select
            id="specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            required
          >
            <option value="">선택해주세요</option>
            {SPECIALTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* 기타 선택 시 직접 입력 필드 표시 */}
          {specialty === 'other' && (
            <div className="mt-2">
              <input
                type="text"
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                placeholder="전문 분야를 직접 입력해주세요"
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
                required
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="socialLinks" className="mb-1 block font-medium">
            소셜 미디어 / 블로그 / 포트폴리오 링크
          </label>
          <input
            id="socialLinks"
            type="text"
            value={socialLinks}
            onChange={(e) => setSocialLinks(e.target.value)}
            placeholder="본인을 소개할 수 있는 사이트 링크를 입력해주세요"
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
          />
          <p className="mt-1 text-xs text-gray-500">
            블로그, 포트폴리오, 인스타그램 등 자신을 소개할 수 있는 링크를
            입력해주세요.
          </p>
        </div>

        <div>
          <label htmlFor="experience" className="mb-1 block font-medium">
            관련 경력 (학력, 자격증, 경력 등){' '}
            <span className="text-red-500">*</span>
          </label>
          <textarea
            id="experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            required
          ></textarea>
        </div>

        {/* 자격증 이미지 첨부 영역 */}
        <div>
          <label className="mb-1 block font-medium">
            자격증 / 경력 증명 이미지
          </label>
          <div className="flex items-start gap-4">
            {certificatePreview ? (
              <div className="relative h-48 w-auto overflow-hidden rounded-lg border">
                <img
                  src={certificatePreview}
                  alt="자격증 미리보기"
                  className="h-full w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCertificateImage(null);
                    setCertificatePreview(null);
                  }}
                  className="absolute right-1 top-1 rounded-full bg-white p-1 shadow hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex h-48 w-40 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                <p className="text-center text-xs text-gray-500">
                  자격증 또는 경력을
                  <br />
                  증명할 수 있는 이미지를
                  <br />
                  업로드해주세요
                </p>
              </div>
            )}

            <div className="flex-1">
              <label
                htmlFor="certificate-upload"
                className="flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Upload className="mr-2 h-4 w-4" />
                이미지 선택하기
              </label>
              <input
                id="certificate-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <p className="mt-2 text-xs text-gray-500">
                * 5MB 이하의 JPG, PNG 파일만 업로드 가능합니다.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="motivation" className="mb-1 block font-medium">
            지원 동기 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="motivation"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            required
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-gradient-to-r from-gold-start to-gold-end py-3 font-medium text-white transition hover:bg-gradient-to-l disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '제출 중...' : '신청'}
        </button>
      </form>
    </div>
  );
}
