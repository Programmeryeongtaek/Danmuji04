import { ModalContentProps } from './Modal';

export default function Content({ children }: ModalContentProps) {
  return <div className="flex flex-col">{children}</div>;
}
