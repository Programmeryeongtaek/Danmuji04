import { ChevronDown } from 'lucide-react';
import { useDropdownContext } from './Context';

const optionLabels = {
  latest: '최신순',
  students: '수강수',
  likes: '좋아요',
} as const;

export default function Trigger() {
  const { selectedOption, toggle, isOpen } = useDropdownContext();

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm transition-colors hover:border-gold-start ${
        isOpen ? 'border-gold-start bg-gray-50' : 'text-gray-700'
      }`}
    >
      <span>{optionLabels[selectedOption]}</span>
      <ChevronDown
        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
}
