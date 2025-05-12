import Modal from '../common/Modal';
import LoginForm from '../auth/LoginForm';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error('error.message');
    }

    onClose();
    router.refresh();
  };

  return (
    <Modal.Root isOpen={isOpen} onClose={onClose}>
      <Modal.CloseButton className="absolute right-24 top-36" />
      <Modal.Content>
        <h1 className="bg-gradient-to-r from-gold-start to-gold-end bg-clip-text text-center text-3xl text-transparent">
          단무지
        </h1>

        <div className="flex flex-col gap-1">
          <LoginForm onSubmit={handleLogin} />
        </div>

        <div className="flex justify-center gap-3">
          <button className="border-b border-gray-500 text-gray-700">
            아이디 찾기
          </button>
          <span className="text-gray-700">|</span>
          <button className="border-b border-gray-500 text-gray-700">
            비밀번호 찾기
          </button>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default LoginModal;
