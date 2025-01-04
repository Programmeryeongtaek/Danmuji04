import { createContext, useContext } from 'react';
import { ModalContextValue } from './Modal';

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModalContext() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error(
      'Modal 컴포넌트는 Modal.Root 내부에서만 사용할 수 있습니다.'
    );
  }

  return context;
}
