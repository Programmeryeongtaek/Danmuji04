import { useDropdownContext } from './Context';

const options = [
  { value: 'latest', label: '최신순' },
  { value: 'students', label: '수강수' },
  { value: 'likes', label: '좋아요' },
] as const;

export default function Context() {
  const { isOpen, selectedOption, select } = useDropdownContext();

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
      {options.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => select(value)}
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
            selectedOption === value
              ? 'bg-gray-50 font-medium text-blue-600'
              : ''
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
