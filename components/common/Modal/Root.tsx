import { MouseEvent, useEffect, useRef } from 'react';
import { ModalRootProps } from './Modal';
import { ModalContext } from './ModalContext';

export default function Root({ children, isOpen, onClose }: ModalRootProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <ModalContext.Provider value={{ isOpen, onClose }}>
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div className="relative h-[550px] w-[600px] rounded-lg bg-light px-16 py-20">
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  );
}
