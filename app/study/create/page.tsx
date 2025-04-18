'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

export default function CreateStudyPage() {
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = [
    { value: '', label: '카테고리 선택' },
    { value: '인문학', label: '인문학' },
    { value: '철학', label: '철학' },
    { value: '심리학', label: '심리학' },
    { value: '경제학', label: '경제학' },
    { value: '자기계발', label: '자기계발' },
    { value: '리더십', label: '리더십' },
  ];

  // 로그인 확인
  useEffect(() => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
    }
  }, [user, router, showToast]);

  // 날짜 기본값 설정 (오늘부터 한 달)
  useEffect(() => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    setStartDate(formatDateForInput(today));
    setEndDate(formatDateForInput(nextMonth));
  }, []);

  // 날짜 포맷 함수
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title || !description || !category || !startDate || !endDate) {
      showToast('모든 필수 항목을 입력해주세요.', 'error');
      return;
    }

    if (!isOnline && !location) {
      showToast('오프라인 스터디의 경우 장소를 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 사용자 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user!.id)
        .single();

      const ownerName =
        profile?.nickname || profile?.name || user?.email || '익명';

      // 스터디 생성
      const { data, error } = await supabase
        .from('studies')
        .insert({
          title,
          description,
          category,
          owner_id: user!.id,
          owner_name: ownerName,
          max_participants: maxParticipants,
          current_participants: 1, // 생성자는 자동 참여
          start_date: startDate,
          end_date: endDate,
          location: isOnline ? '온라인' : location,
          is_online: isOnline,
          status: 'recruiting',
        })
        .select()
        .single();

      if (error) throw error;

      // 생성자를 첫 번째 참여자로 추가
      await supabase.from('study_participants').insert({
        study_id: data.id,
        user_id: user!.id,
        user_name: ownerName,
        role: 'owner',
        joined_at: new Date().toISOString(),
      });

      showToast('스터디가 생성되었습니다.', 'success');
      router.push(`/study/${data.id}`);
    } catch (error) {
      console.error('스터디 생성 실패:', error);
      showToast('스터디 생성에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // TODO: 스터디 설명 또는 참고 사진 추가할 수 있도록 구현
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center">
        <button
          onClick={() => router.back()}
          className="mr-4 rounded-full p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">스터디 개설하기</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="title" className="mb-1 block font-medium">
            스터디 제목 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="스터디 제목을 입력해주세요"
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block font-medium">
            스터디 설명 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="스터디에 대한 설명을 작성해주세요"
            rows={4}
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            required
          ></textarea>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="category" className="mb-1 block font-medium">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
              required
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="maxParticipants" className="mb-1 block font-medium">
              최대 참여 인원 <span className="text-red-500">*</span>
            </label>
            <input
              id="maxParticipants"
              type="number"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
              required
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="mb-1 block font-medium">
              시작일 <span className="text-red-500">*</span>
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
              required
            />
          </div>

          <div>
            <label htmlFor="endDate" className="mb-1 block font-medium">
              종료일 <span className="text-red-500">*</span>
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
              required
            />
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">
            진행 방식 <span className="text-red-500">*</span>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={isOnline}
                onChange={() => setIsOnline(true)}
                className="mr-2"
              />
              온라인
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={!isOnline}
                onChange={() => setIsOnline(false)}
                className="mr-2"
              />
              오프라인
            </label>
          </div>
        </div>

        {!isOnline && (
          <div>
            <label htmlFor="location" className="mb-1 block font-medium">
              오프라인 장소 <span className="text-red-500">*</span>
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="스터디 장소를 입력해주세요"
              className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
              required={!isOnline}
            />
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-6 py-2 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-6 py-2 text-white transition hover:bg-gradient-to-l disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '생성 중...' : '스터디 생성하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
