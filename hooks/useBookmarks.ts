'use client';

import { useToast } from '@/components/common/Toast/Context';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { isLectureBookmarkedAtom, lectureBookmarkAtom, toggleLectureBookmarkAtom } from '@/store/lecture/bookmarkAtom';

export const useBookmarks = () => {
  const bookmarkState = useAtomValue(lectureBookmarkAtom);
  const isBookmarked = useAtomValue(isLectureBookmarkedAtom);
  const [, toggleBookmark] = useAtom(toggleLectureBookmarkAtom);
  const { showToast } = useToast();

  const bookmarkedLectures = Array.from(bookmarkState.lectureBookmarks);
  const isLoading = bookmarkState.isLoading;

  const handleToggleBookmark = useCallback(async (lectureId: number) => {
    try {
      const result = await toggleBookmark(lectureId);

      showToast(
        result
          ? '찜하기에 추가되었습니다.'
          : '찜하기가 취소되었습니다.',
        'success'
      );
    } catch (error) {
      console.error('북마크 토글 실패:', error);

      if (error instanceof Error && error.message === '로그인이 필요합니다.') {
        showToast('로그인이 필요합니다.', 'error');
      } else {
        showToast('오류가 발생했습니다.', 'error');
      }
    }
  }, [toggleBookmark, showToast]);

  return {
    bookmarkedLectures,
    handleToggleBookmark,
    isLoading,
    isBookmarked
  };
};