import { usePaginationContext } from './Context';
import { PaginationItemProps } from './Types';

export default function Item({
  page,
  isCurrent: isCurrentProp,
  onClick,
}: PaginationItemProps) {
  const { currentPage, onPageChange } = usePaginationContext();

  // isCUrrent prop이 제공되면 그 값을 사용하고, 그렇지 않으면 currentPagedhk qlry
  const isCurrent =
    isCurrentProp !== undefined ? isCurrentProp : currentPage === page;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      onPageChange(page);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`h-8 w-8 rounded ${
        isCurrent
          ? 'bg-gold-start text-white'
          : 'border text-gray-700 hover:bg-gray-50'
      }`}
    >
      {page}
    </button>
  );
}
