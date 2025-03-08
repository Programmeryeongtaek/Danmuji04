import { ReactNode } from 'react';

interface MessageProps {
  children: ReactNode;
}

const Message = ({ children }: MessageProps) => {
  return <span className="text-sm">{children}</span>;
};

export default Message;
