'use client';

import { useCallback } from 'react';
import { useBookmarksList, useToggleBookmark } from './api/useBookmarks';

export const useBookmarks = () => {
  const { mutate: toggleBookmark } = useToggleBookmark();
  const { data: bookmarksList, isLoading } = useBookmarksList('lecture');

  const bookmarkedLectures = bookmarksList?.data?.map(item => item.lecture_id) || [];

  const handleToggleBookmark = useCallback(async (lectureId: number) => {
    toggleBookmark({ id: lectureId, type: 'lecture'});
  }, [toggleBookmark]);

  const isBookmarked = (lectureId: number) => {
    return bookmarkedLectures.includes(lectureId);
  };

  return {
    bookmarkedLectures,
    handleToggleBookmark,
    isLoading,
    isBookmarked
  };
};