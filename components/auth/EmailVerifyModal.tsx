import { Inbox } from 'lucide-react';
import Modal from '../common/Modal';

interface EmailVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

const EmailVerifyModal = ({
  isOpen,
  onClose,
  email,
}: EmailVerifyModalProps) => {
  return (
    <Modal.Root isOpen={isOpen} onClose={onClose}>
      <Modal.CloseButton />
      <Modal.Content>
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="rounded-full bg-emerald-50 p-4">
            <Inbox className="h-8 w-8 text-emerald-600" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold">이메일을 확인해주세요</h2>
            <p className="text-gray-600">
              <span className="font-medium text-gray-900">{email}</span>
              <br />
              주소로 인증 메일을 발송했습니다
            </p>
          </div>

          <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 font-semibold text-gray-900">
              메일을 받지 못하셨나요?
            </p>
            <ul className="ml-5 list-disc text-sm text-gray-600">
              <li>스팸 메일함을 확인해주세요</li>
              <li>메일이 도착하기까지 몇 분이 소요될 수 있습니다</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gradient-to-r from-gold-start to-gold-end py-3 text-center text-white transition hover:bg-gradient-to-l"
          >
            확인
          </button>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default EmailVerifyModal;
