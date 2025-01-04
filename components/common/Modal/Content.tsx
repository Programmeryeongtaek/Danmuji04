import { ModalContentProps } from './Modal';

export default function Content({ children }: ModalContentProps) {
  return <div className="px-7 pt-20">{children}</div>;
}
