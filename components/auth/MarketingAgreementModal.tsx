import { SignUpFormData } from '@/hooks/useSignUpForm';
import Modal from '../common/Modal';
import { X } from 'lucide-react';
import Button from '../common/Button/Button';

interface MarketingAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: SignUpFormData;
  onAgree: (agreed: boolean) => void;
}

const MarketingAgreementModal = ({
  isOpen,
  onClose,
  formData,
  onAgree,
}: MarketingAgreementModalProps) => {
  return (
    <Modal.Root isOpen={isOpen} onClose={onClose}>
      <div className="fixed flex w-11/12 flex-col bg-white">
        {/* 헤더 */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <h2 className="text-lg font-medium">마케팅 정보 수신 동의</h2>
          <button onClick={onClose}>
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 스크롤 가능한 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* 수집항목 */}
          <div className="mb-6">
            <h3 className="mb-2 font-medium">수집항목</h3>
            <div className="space-y-2">
              <p>이메일: {formData.email}</p>
              <p>이름: {formData.name}</p>
              {formData.nickname && <p>닉네임: {formData.nickname}</p>}
              <p>
                관심분야:{' '}
                {[...formData.interests, ...formData.customInterests].join(
                  ', '
                )}
              </p>
            </div>
          </div>

          {/* 수집 및 이용 목적 */}
          <div className="mb-6">
            <h3 className="mb-2 font-medium">수집 및 이용 목적</h3>
            <ul className="space-y-2 text-gray-600">
              <li>단무지의 새로운 스터디 및 모임 소식 안내</li>
              <li>관심 분야에 맞는 맞춤형 학습 콘텐츠 추천</li>
              <li>이벤트, 혜택 및 마케팅 정보 제공</li>
              <li>서비스 개선을 위한 통계 활용</li>
            </ul>
          </div>

          {/* 보유 및 이용 기간 */}
          <div className="mb-6">
            <h3 className="mb-2 font-medium">보유 및 이용 기간</h3>
            <p className="text-gray-600">
              회원 탈퇴 시 또는 마케팅 수신 동의 철회 시까지
            </p>
          </div>
        </div>

        {/* 하단 고정 버튼 */}
        <div className="border-t bg-white px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                onAgree(false);
                onClose();
              }}
              className="flex-1 rounded-lg border border-gray-300 py-3 hover:bg-gray-50"
            >
              비동의
            </button>
            <Button
              onClick={() => {
                onAgree(true);
                onClose();
              }}
              className="flex-1"
            >
              동의
            </Button>
          </div>
        </div>
      </div>
    </Modal.Root>
  );
};

export default MarketingAgreementModal;
