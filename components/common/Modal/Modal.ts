import { ReactNode } from 'react';

export interface ModalContextValue {
  isOpen: boolean;
  onClose: () => void;
}

export interface ModalRootProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export interface ModalContentProps {
  children: ReactNode;
}

export interface ModalCloseButtonProps {
  className?: string;
}