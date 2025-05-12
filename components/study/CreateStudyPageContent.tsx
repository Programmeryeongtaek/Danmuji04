'use client';

import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../common/Toast/Context';
import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import { ArrowLeft, Book } from 'lucide-react';

// 인터페이스 정의
interface BookInfo {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
}

export default function CreateStudyPageContent() {
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const searchParams = useSearchParams();
  const bookId = searchParams.get('book_id');
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
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);

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

  // 도서 ID가 URL에 있는 경우 도서 정보 로드
  useEffect(() => {
    const fetchBookInfo = async () => {
      if (!bookId) return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('books')
          .select('id, title, author, cover_url')
          .eq('id', bookId)
          .single();

        if (error) throw error;

        setBookInfo(data);

        // 입력 필드 자동 채우기
        setTitle(`[도서] ${data.title} 스터디`);
        setCategory('book'); // 도서 카테고리로 자동 설정
      } catch (error) {
        console.error('도서 정보 로드 실패:', error);
      }
    };

    fetchBookInfo();
  }, [bookId]);

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
          book_id: bookInfo?.id || null, // 도서 연결 정보 추가
        })
        .select()
        .single();

      if (error) throw error;

      // 생성자를 첫 번째 참여자로 추가하고 자동으로 승인 상태로 설정
      await supabase.from('study_participants').insert({
        study_id: data.id,
        user_id: user!.id,
        user_name: ownerName,
        role: 'owner',
        status: 'approved', // 방장은 자동으로 승인 상태로 설정
        joined_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      });

      // 스터디 테이블에 approved_participants 필드 업데이트
      await supabase
        .from('studies')
        .update({
          approved_participants: 1, // 방장이 첫 번째 승인된 참여자
        })
        .eq('id', data.id);

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
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-white p-6 shadow-sm"
    >
      {/* 도서 정보가 있는 경우 표시 (추가) */}
      {bookInfo && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <div className="flex items-center">
            {bookInfo.cover_url ? (
              <Image
                src={bookInfo.cover_url}
                alt={bookInfo.title}
                width={48}
                height={64}
                unoptimized={true}
                className="mr-4rounded object-cover shadow-sm"
              />
            ) : (
              <div className="mr-4 flex h-16 w-12 items-center justify-center rounded bg-gray-200">
                <Book className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-blue-800">
                도서 스터디
              </div>
              <div className="font-medium">{bookInfo.title}</div>
              <div className="text-sm text-gray-600">{bookInfo.author}</div>
            </div>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 rounded-full p-2 hover:bg-gray-100 hover:text-gold-start"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">스터디 개설하기</h1>
        </div>
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
            {isSubmitting ? '생성 중...' : '생성'}
          </button>
        </div>
      </div>
    </form>
  );
}
