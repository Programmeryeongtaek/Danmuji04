'use client';

import { useToast } from '@/components/common/Toast/Context';
import { useCallback, useEffect, useState } from 'react';
import useSupabase from './useSupabase';
import { ToastType } from '@/components/common/Toast/type';

export const useBookmarks = () => {
  const [bookmarkedLectures, setBookmarkedLectures] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const { supabase, user } = useSupabase();

  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarkedLectures([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await supabase
        .from('bookmarks')
        .select('lecture_id')
        .eq('user_id', user.id);

      if (data) {
        setBookmarkedLectures(data.map(b => b.lecture_id));
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user]);

  const handleToggleBookmark = useCallback(async (lectureId: number) => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error' as ToastType);
      return;
    }

    try {
      const isCurrentlyBookmarked = bookmarkedLectures.includes(lectureId);

      if (isCurrentlyBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('lecture_id', lectureId)
          .eq('user_id', user.id);

        setBookmarkedLectures(prev => prev.filter(id => id !== lectureId));
        showToast('찜하기가 취소되었습니다.', 'success');
      } else {
        await supabase
          .from('bookmarks')
          .insert([{ lecture_id: lectureId, user_id: user.id }]);

        setBookmarkedLectures(prev => [...prev, lectureId]);
        showToast('찜하기에 추가되었습니다.', 'success');
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      showToast('오류가 발생했습니다.', 'error');
    }
  }, [supabase, user, bookmarkedLectures, showToast]);

  useEffect(() => {
    fetchBookmarks();
    
    if (!user) return;
    
    const channel = supabase
      .channel('bookmarks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBookmarks();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, user, fetchBookmarks]);

  return {
    bookmarkedLectures,
    handleToggleBookmark,
    isLoading,
    fetchBookmarks
  };
};