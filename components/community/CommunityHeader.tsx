'use client';

import { FilterOptions } from '@/app/types/community/communityType';
import { ChevronDown, ListFilter, PlusCircle, Search } from 'lucide-react';
import { FormEvent } from 'react';
import { SORT_OPTIONS } from './Const';
import { User } from '@supabase/supabase-js';

interface CommunityHeaderProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearch: (e: FormEvent) => void;
  sortBy: FilterOptions['sort'];
  onSortChange: (sort: FilterOptions['sort']) => void;
  showSortOptions: boolean;
  onToggleSortOptions: () => void;
  onWriteClick: () => void;
  user: User | null;
}

export default function CommunityHeader({
  searchTerm,
  onSearchTermChange,
  onSearch,
  sortBy,
  onSortChange,
  showSortOptions,
  onToggleSortOptions,
  onWriteClick,
}: CommunityHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
      <form onSubmit={onSearch} className="relative w-full max-w-md">
        <input
          type="text"
          placeholder="검색어를 입력하세요."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="w-full rounded-lg border px-10 py-2 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
        />
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <button type="submit" className="sr-only">
          검색
        </button>
      </form>

      <div className="flex items-center gap-3">
        {/* 정렬 옵션 */}
        <div className="relative">
          <button
            onClick={onToggleSortOptions}
            className="flex items-center gap-1 rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            <ListFilter className="h-5 w-5" />
            <span>
              {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {showSortOptions && (
            <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border bg-white shadow-lg">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value as FilterOptions['sort']);
                    onToggleSortOptions();
                  }}
                  className={`flex w-full items-center px-4 py-2 text-left hover:bg-gray-50 ${
                    sortBy === option.value ? 'bg-gray-100 font-medium' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onWriteClick}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition-all hover:bg-gradient-to-l"
        >
          <PlusCircle className="h-5 w-5" />
          <span>작성</span>
        </button>
      </div>
    </div>
  );
}
