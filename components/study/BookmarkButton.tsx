'use client';

import { useToast } from '../common/Toast/Context';
import { BookmarkIcon } from 'lucide-react';
import { useAtom, useAtomValue } from 'jotai';
import { bookmarkAtom, toggleBookmarkAtom } from '@/store/study/bookmarkAtom';

interface BookmarkButtonProps {
  studyId: string;
  className?: string;
}

export default function BookmarkButton({
  studyId,
  className = '',
}: BookmarkButtonProps) {
  const bookmarkState = useAtomValue(bookmarkAtom);
  const [, toggleBookmark] = useAtom(toggleBookmarkAtom);
  const { showToast } = useToast();

  const isBookmarked = bookmarkState.studyBookmarks.has(studyId);
  const isLoading = bookmarkState.isLoading;

  const handleToggleBookmark = async () => {
    try {
      const result = await toggleBookmark(studyId);

      showToast(
        result
          ? '스터디가 북마크에 추가되었습니다.'
          : '스터디가 북마크에서 제거되었습니다.',
        'success'
      );
    } catch (error) {
      console.error('북마크 토글 실패:', error);
      showToast('북마크 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <button
      onClick={handleToggleBookmark}
      disabled={isLoading}
      className={`flex items-center gap-1 rounded-lg border p-2 transition-colors ${
        isBookmarked
          ? 'border-amber-500 bg-amber-50 text-amber-500'
          : 'border-gray-300 text-gray-500 hover:border-gold-start hover:bg-gold-start hover:text-black'
      } ${className}`}
      aria-label={isBookmarked ? '북마크 제거' : '북마크 추가'}
    >
      <BookmarkIcon
        className={`h-5 w-5 ${isBookmarked ? 'fill-amber-500' : ''}`}
      />
    </button>
  );
}
