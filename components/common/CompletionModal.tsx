'use client';

import { CheckCircle, ChevronRight } from 'lucide-react';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLastVideo?: boolean;
  onNextVideo: () => void;
}

//TODO: 강의 완료 모달과 / 코스 완료 모달을 구분하자.
export default function CompletionModal({
  isOpen,
  onClose,
  isLastVideo,
  onNextVideo,
}: CompletionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="mb-4 text-center text-xl font-bold">
          {isLastVideo ? '강의를 모두 완료했습니다!' : '학습 완료!'}
        </h2>
        <p className="mb-6 text-center text-gray-600">
          {isLastVideo
            ? '이 강의를 성공적으로 마쳤습니다. 수고하셨습니다!'
            : '이 섹션의 학습을 완료했습니다. 다음 강의로 넘어가세요.'}
        </p>
        <div className="flex justify-center gap-4">
          {!isLastVideo && (
            <button
              onClick={onNextVideo}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              <span>다음 강의</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            {isLastVideo ? '확인' : '지금은 계속 보기'}
          </button>
        </div>
      </div>
    </div>
  );
}
