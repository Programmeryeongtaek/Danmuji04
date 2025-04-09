import { createContext, useContext } from 'react';
import { PaginationContextValue } from './Types';

export const PaginationContext = createContext<PaginationContextValue | null>(
  null
);

export function usePaginationContext() {
  const context = useContext(PaginationContext);

  if (!context) {
    throw new Error(
      'Pagination 컴포넌트는 Pagination.Root 내부에서만 사용할 수 있습니다.'
    );
  }

  return context;
}
