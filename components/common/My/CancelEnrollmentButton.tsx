'use client';

import { useState } from 'react';
import { useToast } from '../Toast/Context';
import { cancelEnrollment } from '@/utils/supabase/client';
import { ToastType } from '../Toast/type';
import { AlertTriangle } from 'lucide-react';

interface CancelEnrollmentButtonProps {
  lectureId: number;
  progress: number;
  onCancelSuccess?: () => void;
}

export default function CancelEnrollmentButton({
  lectureId,
  progress,
  onCancelSuccess,
}: CancelEnrollmentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { showToast } = useToast();

  // 진행률이 20% 이상인 경우 취소 불가능
  const isDisabled = progress >= 20;

  const handleCancel = async () => {
    // 진행률이 20% 이상인 경우 토스트 메시지 표시 후 종료
    if (isDisabled) {
      showToast('수강률이 20% 이상인 강의는 취소할 수 없습니다.');
      return;
    }

    if (isLoading) return;

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setIsLoading(true);
      const { success, message } = await cancelEnrollment(lectureId);

      if (success) {
        showToast(message, 'success');
        setShowConfirm(false);

        if (onCancelSuccess) {
          onCancelSuccess();
        }
      } else {
        showToast(message, 'error');
      }
    } catch (error) {
      showToast('수강 취소 중 오류가 발생했습니다.', error as ToastType);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={handleCancel}
        disabled={isDisabled}
        className={`text-sm text-red-500 hover:underline ${
          isDisabled ? 'cursor-not-allowed opacity-50' : ''
        }`}
        aria-label={
          isDisabled
            ? '수강률이 20% 이상인 강의는 취소할 수 없습니다'
            : '수강 취소'
        }
      >
        수강 취소
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-red-50 p-2">
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          정말 수강을 취소하시겠습니까?
        </span>
      </div>
      <p className="text-xs text-gray-600">
        취소 후에는 복구할 수 없으며, 다시 수강신청해야 합니다.
      </p>
      <div className="mt-1 flex gap-2">
        <button
          onClick={() => setShowConfirm(false)}
          className="rounded-md bg-gray-200 px-3 py-1 text-xs"
        >
          취소
        </button>
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="rounded-md bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
        >
          {isLoading ? '처리 중...' : '확인'}
        </button>
      </div>
    </div>
  );
}
