import { createContext, useContext } from 'react';
import { DropdownContextValue } from './Type';

export const DropdownContext = createContext<DropdownContextValue | null>(null);

export function useDropdownContext() {
  const context = useContext(DropdownContext);

  if (!context) {
    throw new Error(
      'Dropdown 컴포넌트는 Dropdown.Root 내부에서만 사용할 수 있습니다.'
    );
  }

  return context;
}
