'use client';

import { COMMUNITY_CATEGORIES } from './Const';

interface CategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CommunityCategoryTabs({
  selectedCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <div className="flex overflow-x-auto rounded-lg border mobile:mb-4 tablet:mb-6 laptop:mb-8">
      {COMMUNITY_CATEGORIES.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`flex flex-1 items-center justify-center gap-1 transition-colors mobile:min-w-[60px] mobile:p-2 mobile:text-sm sm:min-w-[120px] sm:p-4 sm:text-base ${
            selectedCategory === category.id
              ? 'bg-gold-start text-black'
              : 'bg-white hover:bg-gold-start'
          }`}
        >
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
}
