import { X } from 'lucide-react';
import { ModalCloseButtonProps } from './Modal';
import { useModalContext } from './ModalContext';

export default function CloseButton({ className }: ModalCloseButtonProps) {
  const { onClose } = useModalContext();

  return (
    <button
      onClick={onClose}
      className={`absolute right-10 top-[130px] text-gray-500 hover:text-gray-700 ${className}`}
    >
      <X size={20} />
    </button>
  );
}
