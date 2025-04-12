import { PaginationEllipsisProps } from './Types';

export default function Ellipsis({ className = '' }: PaginationEllipsisProps) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center text-gray-500 ${className}`}
      aria-hidden="true"
    >
      ...
    </span>
  );
}
