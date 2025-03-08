export type ToastType = 'success' | 'error' | 'info';

export interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}