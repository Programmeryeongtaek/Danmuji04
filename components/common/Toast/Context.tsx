import { createContext, useContext } from 'react';
import { ToastContextType } from './type';

export const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext<ToastContextType | null>(ToastContext);

  if (!context) {
    throw new Error('ToastContext must be used within a ToastProvider');
  }

  return context;
}
