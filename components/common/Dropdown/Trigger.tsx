import { ChevronDown } from 'lucide-react';
import { useDropdownContext } from './Context';

const optionLabels = {
  latest: '최신순',
  students: '수강수',
  likes: '좋아요',
} as const;

export default function Trigger() {
  const { selectedOption, toggle } = useDropdownContext();

  return (
    <button onClick={toggle} className="flex items-center rounded-lg px-2 py-1">
      <span>{optionLabels[selectedOption]}</span>
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}
