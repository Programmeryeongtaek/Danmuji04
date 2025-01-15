'use client';

import Modal from '@/components/common/Modal';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLastVideo: boolean;
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
        <div className="text-center">
          <h3 className="text-2xl font-bold">강의를 완료했습니다!</h3>
          <p className="mt-4 text-gray-600">
            {!isLastVideo
              ? '다음 강의로 이동하시겠습니까?'
              : '축하합니다! 모든 강의를 완료했습니다!'}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <button onClick={onClose}>계속 보기</button>
            {!isLastVideo && onNextVideo && (
              <button onClick={onNextVideo}>다음 강의</button>
            )}
          </div>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CompletionModal;
