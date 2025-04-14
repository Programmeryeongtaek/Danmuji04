'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

export default function InstructorRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [experience, setExperience] = useState('');
  const [motivation, setMotivation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
      return;
    }

    if (
      !name ||
      !email ||
      !phoneNumber ||
      !specialty ||
      !experience ||
      !motivation
    ) {
      showToast('모든 필드를 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 강사 신청 정보 저장
      const { error } = await supabase.from('instructor_applications').insert({
        user_id: user.id,
        name,
        email,
        phone_number: phoneNumber,
        specialty,
        experience,
        motivation,
        status: 'pending', // 관리자 승인 대기 상태
      });

      if (error) throw error;

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
            강사 등록 신청이 접수되었습니다. 검토 후 이메일로 결과를
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
        <h1 className="mb-2 text-3xl font-bold">강사 등록 신청</h1>
        <p className="text-gray-600">
          단무지에서 당신의 지식과 경험을 나누어 보세요.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="name" className="mb-1 block font-medium">
            이름
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
            이메일
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
            연락처
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
          {/* //TODO: 전문분야 셀프 추가 기능 */}
          <label htmlFor="specialty" className="mb-1 block font-medium">
            전문 분야
          </label>
          <select
            id="specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            required
          >
            <option value="">선택해주세요</option>
            <option value="인문학">인문학</option>
            <option value="철학">철학</option>
            <option value="심리학">심리학</option>
            <option value="경제학">경제학</option>
            <option value="자기계발">자기계발</option>
            <option value="리더십">리더십</option>
          </select>
        </div>

        <div>
          <label htmlFor="experience" className="mb-1 block font-medium">
            관련 경력 (학력, 자격증, 경력 등)
            {/* //TODO: 자격 인증 사진 추가 기능능 */}
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

        <div>
          <label htmlFor="motivation" className="mb-1 block font-medium">
            지원 동기
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
          {isSubmitting ? '제출 중...' : '신청하기'}
        </button>
      </form>
    </div>
  );
}
