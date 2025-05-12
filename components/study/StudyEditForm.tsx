'use client';

import { FormEvent, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { createClient } from '@/utils/supabase/client';

// 스터디 수정 폼 타입
interface StudyFormData {
  title: string;
  description: string;
  max_participants: number;
  start_date: string;
  end_date: string;
  location: string;
  is_online: boolean;
}

// 컴포넌트 props 타입
interface StudyEditFormProps {
  studyId: string;
  initialData: StudyFormData;
  onCancel: () => void;
  onSuccess: (updatedData: StudyFormData) => void;
}

export default function StudyEditForm({
  studyId,
  initialData,
  onCancel,
  onSuccess,
}: StudyEditFormProps) {
  // 폼 상태
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [maxParticipants, setMaxParticipants] = useState(
    initialData.max_participants
  );
  const [startDate, setStartDate] = useState(initialData.start_date);
  const [endDate, setEndDate] = useState(initialData.end_date);
  const [location, setLocation] = useState(initialData.location);
  const [isOnline, setIsOnline] = useState(initialData.is_online);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  // 폼 제출 처리
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 입력 검증
    if (!title || !description || !startDate || !endDate) {
      showToast('필수 항목을 모두 입력해주세요.', 'error');
      return;
    }

    // 최소 참여자 수 검증
    if (maxParticipants < 2) {
      showToast('최대 참여자 수는 2명 이상이어야 합니다.', 'error');
      return;
    }

    // 날짜 검증
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      showToast('종료일은 시작일 이후여야 합니다.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 사용자 정보 확인
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      // RPC 함수 호출
      const { data: success, error } = await supabase.rpc('update_study', {
        p_study_id: studyId,
        p_owner_id: user.id,
        p_title: title,
        p_description: description,
        p_max_participants: maxParticipants,
        p_start_date: startDate,
        p_end_date: endDate,
        p_location: location,
        p_is_online: isOnline,
      });

      if (error) throw error;

      if (!success) {
        showToast(
          '스터디 정보 수정에 실패헀습니다. 권한이 없거나 참여자 수 제한을 확인해주세요.',
          'error'
        );
        return;
      }

      // 업데이트된 데이터 객체 생성
      const updatedData: StudyFormData = {
        title,
        description,
        max_participants: maxParticipants,
        start_date: startDate,
        end_date: endDate,
        location,
        is_online: isOnline,
      };

      showToast('스터디 정보가 수정되었습니다.', 'success');
      onSuccess(updatedData);
      onCancel(); // 수정 모드 종료
    } catch (error) {
      console.error('스터디 수정 실패:', error);
      showToast('스터디 정보 수정 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="mb-1 block font-medium">
          스터디 제목 <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border p-2 focus:border-gold-start focus:outline-none"
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
          rows={4}
          className="w-full rounded-lg border p-2 focus:border-gold-start focus:outline-none"
          required
        ></textarea>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
            className="w-full rounded-lg border p-2 focus:border-gold-start focus:outline-none"
            required
          />
        </div>

        <div>
          <div className="mb-1 font-medium">
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="mb-1 block font-medium">
            시작일 <span className="text-red-500">*</span>
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border p-2 focus:border-gold-start focus:outline-none"
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
            className="w-full rounded-lg border p-2 focus:border-gold-start focus:outline-none"
            required
          />
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
            className="w-full rounded-lg border p-2 focus:border-gold-start focus:outline-none"
            required={!isOnline}
          />
        </div>
      )}

      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white hover:bg-gradient-to-l disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
