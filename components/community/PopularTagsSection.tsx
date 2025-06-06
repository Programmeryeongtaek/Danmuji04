'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

interface PopularTagsSectionProps {
  popularTags: { name: string; count: number }[];
  selectedTag: string | null;
  showTagSection: boolean;
  onToggleTagSection: () => void;
  onTagClick: (tag: string) => void;
}

export default function PopularTagsSections({
  popularTags,
  selectedTag,
  showTagSection,
  onToggleTagSection,
  onTagClick,
}: PopularTagsSectionProps) {
  return (
    <div className="mb-6 rounded-lg border bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">인기 태그</h3>
        <button
          onClick={onToggleTagSection}
          className="text-gray-500 hover:text-gold-start"
        >
          {showTagSection ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>

      {showTagSection && (
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => onTagClick(tag.name)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                selectedTag === tag.name
                  ? 'bg-gold-start text-black'
                  : 'bg-white text-gray-700 hover:bg-gold-start hover:text-black'
              }`}
            >
              #{tag.name}
              <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                {tag.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
