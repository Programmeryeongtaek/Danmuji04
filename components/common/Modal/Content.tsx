import { ModalContentProps } from './Modal';

export default function Content({ children }: ModalContentProps) {
  return <div className="p-6">{children}</div>;
}
