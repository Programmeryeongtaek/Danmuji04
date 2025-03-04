'use client';

import Button from '@/components/common/Button/Button';
import Modal from '@/components/common/Modal';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLastVideo?: boolean;
  onNextVideo?: () => void;
}

const CompletionModal = ({
  isOpen,
  onClose,
  isLastVideo,
  onNextVideo,
}: CompletionModalProps) => {
  return (
    <Modal.Root isOpen={isOpen} onClose={onClose}>
      <Modal.CloseButton />
      <Modal.Content>
        <div className="py-4 text-center">
          <h3 className="mb-4 text-2xl font-bold">
            {isLastVideo
              ? '학습을 완료하셨습니다!'
              : '강의 시청을 완료하였습니다.'}
          </h3>
          <p className="mt-4 text-gray-600">
            {isLastVideo ? '축하합니다!' : '다음 강의로 넘어가시겠습니까?'}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            {!isLastVideo && onNextVideo && (
              <Button
                onClick={onNextVideo}
                className="rounded-lg bg-blue-500 px-4 py-2 text-white"
              >
                다음 강의
              </Button>
            )}
            {isLastVideo && onNextVideo && (
              <Button
                onClick={onNextVideo}
                className="rounded-lg bg-green-500 px-4 py-2 text-white"
              >
                확인
              </Button>
            )}
          </div>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CompletionModal;
