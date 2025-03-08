import { ReactNode } from 'react';
import { ToastType } from './type';
import { AlertCircle, Check, X } from 'lucide-react';

interface RootProps {
  children: ReactNode;
  type: ToastType;
}

const Root = ({ children, type }: RootProps) => {
  const icons = {
    success: <Check className="h-4 w-4" />,
    error: <X className="h-4 w-4" />,
    info: <AlertCircle className="h-4 w-4" />,
  };

  const backgrounds = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 transform">
      <div
        className={`flex items-center gap-2 rounded-lg ${backgrounds[type]} px-4 py-2 text-white shadow-lg`}
      >
        {icons[type]}
        {children}
      </div>
    </div>
  );
};

export default Root;
