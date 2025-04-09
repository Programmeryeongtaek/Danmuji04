import { ReactNode } from 'react';

export interface PaginationContextValue {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface PaginationRootProps {
  children: ReactNode;
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export interface PaginationItemProps {
  page: number;
  isCurrent?: boolean;
  onClick?: () => void;
}

export interface PaginationEllipsisProps {
  className?: string;
}

export interface PaginationControlProps {
  direction: 'prev' | 'next';
  disabled?: boolean;
  className?: string;
}

export interface PaginationListProps {
  className?: string;
}