import { X } from 'lucide-react';
import { ModalCloseButtonProps } from './Modal';
import { useModalContext } from './ModalContext';

export default function CloseButton({ className }: ModalCloseButtonProps) {
  const { onClose } = useModalContext();

  return (
    <button
      onClick={onClose}
      className={`absolute right-[30px] top-[30px] rounded-full border p-1 text-gray-500 hover:border-black hover:text-black ${className}`}
    >
      <X size={20} />
    </button>
  );
}
