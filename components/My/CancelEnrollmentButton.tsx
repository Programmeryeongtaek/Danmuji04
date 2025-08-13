'use client';

import { useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { AlertTriangle } from 'lucide-react';
import { useCancelEnrollment } from '@/hooks/api/useEnrollment';

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
  const [showConfirm, setShowConfirm] = useState(false);
  const { showToast } = useToast();

  const cancelMutation = useCancelEnrollment();
  const isLoading = cancelMutation.isPending;

  const handleCancel = async () => {
    // 진행률이 20% 이상인 경우 토스트 메시지 표시 후 종료
    if (progress >= 20) {
      showToast('수강률이 20% 이상인 강의는 취소할 수 없습니다.');
      return;
    }

    if (isLoading) return;

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      await cancelMutation.mutateAsync(lectureId);
      showToast('수강 취소가 완료되었습니다.', 'success');
      setShowConfirm(false);

      if (onCancelSuccess) {
        onCancelSuccess();
      }
    } catch (error) {
      console.error('수강 취소 처리 중 예외 발생:', error);
      showToast('수강 취소 중 오류가 발생했습니다.', 'error');
    }
  };

  // 진행률이 20% 이상인 경우 취소 불가능
  const isDisabled = progress >= 20;

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
        <span className="text-sm font-medium">수강취소 하시겠습니까?</span>
      </div>
      <p className="text-xs text-gray-600">취소 후에는 복구할 수 없습니다.</p>
      <div className="mt-1 flex justify-end gap-2">
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
