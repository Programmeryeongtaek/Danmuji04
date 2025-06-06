'use client';

import Button from '../common/Button/Button';

type BookmarkFilterType = 'latest' | 'category' | 'importance';

interface BookmarkFilterControlsProps {
  selectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  isDeleting: boolean;
  filterType: BookmarkFilterType;
  categoryFilter: string | null;
  importanceFilter: number | null;
  categories: string[];
  importanceOptions: Array<{ value: number; label: string; color: string }>;
  onToggleSelectionMode: () => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  onFilterTypeChange: (type: BookmarkFilterType) => void;
  onCategoryFilterChange: (category: string | null) => void;
  onImportanceFilterChange: (importance: number | null) => void;
  getCategoryName: (categoryId: string) => string;
}

export default function BookmarkFilterControls({
  selectionMode,
  selectedCount,
  totalCount,
  isDeleting,
  filterType,
  categoryFilter,
  importanceFilter,
  categories,
  importanceOptions,
  onToggleSelectionMode,
  onToggleSelectAll,
  onDeleteSelected,
  onFilterTypeChange,
  onCategoryFilterChange,
  onImportanceFilterChange,
  getCategoryName,
}: BookmarkFilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={onToggleSelectionMode}
        className={`px-3 py-1 text-sm ${
          selectionMode ? 'bg-red-500 hover:bg-red-600' : ''
        }`}
      >
        {selectionMode ? '선택 취소' : '선택 모드'}
      </Button>

      {selectionMode && (
        <>
          <Button onClick={onToggleSelectAll} className="px-3 py-1 text-sm">
            {selectedCount === totalCount ? '전체 해제' : '전체 선택'}
          </Button>

          <Button
            onClick={onDeleteSelected}
            className="bg-red-500 px-3 py-1 text-sm hover:bg-red-600"
            disabled={selectedCount === 0 || isDeleting}
          >
            {isDeleting ? '삭제 중...' : `삭제 (${selectedCount})`}
          </Button>
        </>
      )}

      {!selectionMode && (
        <div className="flex flex-wrap items-center gap-2">
          {/* 주 필터 드롭다운 */}
          <select
            value={filterType}
            onChange={(e) =>
              onFilterTypeChange(e.target.value as BookmarkFilterType)
            }
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="latest">최신순</option>
            <option value="category">카테고리</option>
            <option value="importance">중요도</option>
          </select>

          {/* 카테고리 하위 필터 */}
          {filterType === 'category' && (
            <select
              value={categoryFilter || ''}
              onChange={(e) => onCategoryFilterChange(e.target.value || null)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">모든 카테고리</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {getCategoryName(category)}
                </option>
              ))}
            </select>
          )}

          {/* 중요도 하위 필터 */}
          {filterType === 'importance' && (
            <select
              value={
                importanceFilter !== null ? importanceFilter.toString() : ''
              }
              onChange={(e) =>
                onImportanceFilterChange(
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">모든 중요도</option>
              {importanceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
