'use client';

import { useBookmarkStatus, useToggleBookmark } from '@/hooks/api/useBookmarks';
import { Bookmark } from 'lucide-react';

interface BookmarkButtonProps {
  lectureId: number;
}

const BookmarkButton = ({ lectureId }: BookmarkButtonProps) => {
  const { data: bookmarkStatus, isLoading } = useBookmarkStatus(
    lectureId,
    'lecture'
  );
  const { mutate: toggleBookmark, isPending } = useToggleBookmark();

  const isBookmarked = bookmarkStatus?.isBookmarked || false;
  const isDisabled = isLoading || isPending;

  const handleBookmark = () => {
    toggleBookmark({ id: lectureId, type: 'lecture' });
  };

  return (
    <button
      onClick={handleBookmark}
      disabled={isDisabled}
      className={`flex items-center gap-2 p-2 transition-opacity ${
        isDisabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      <Bookmark
        className={`h-5 w-5 transition-colors hover:text-gold-start ${
          isBookmarked ? 'fill-gold-start text-gold-start' : ''
        }`}
      />
    </button>
  );
};

export default BookmarkButton;
