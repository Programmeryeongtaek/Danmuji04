'use client';

import { ReactNode, useCallback, useState } from 'react';
import { ToastType } from './type';
import { ToastContext } from './Context';
import Root from './Root';
import Message from './Message';

interface ToastProviderPros {
  children: ReactNode;
}

const Provider = ({ children }: ToastProviderPros) => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      setMessage(message);
      setType(type);
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 2000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {isVisible && (
        <Root type={type}>
          <Message>{message}</Message>
        </Root>
      )}
    </ToastContext.Provider>
  );
};

export default Provider;
