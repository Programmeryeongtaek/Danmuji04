'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import { ToastType } from '@/components/common/Toast/type';
import { createClient } from '@/utils/supabase/client';
import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BookmarkButtonProps {
  lectureId: number;
  initialIsBookmarked: boolean;
}

const BookmarkButton = ({
  lectureId,
  initialIsBookmarked,
}: BookmarkButtonProps) => {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const { showToast } = useToast();

  const handleBookmark = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast(
        '찜하기는 로그인 후 이용할 수 있습니다.',
        'warning' as ToastType
      );
      return;
    }

    try {
      // 먼저 현재 북마크 상태를 확인
      const { data: existingBookmark } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('lecture_id', lectureId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingBookmark) {
        // 찜하기 취소
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (!error) {
          setIsBookmarked(false);
          showToast('찜하기가 취소되었습니다.', 'success' as ToastType);
        }
      } else {
        // 찜하기 추가
        const { error } = await supabase.from('bookmarks').upsert(
          [
            {
              lecture_id: lectureId,
              user_id: user.id,
            },
          ],
          {
            onConflict: 'lecture_id,user_id',
            ignoreDuplicates: true,
          }
        );

        if (!error) {
          setIsBookmarked(true);
          showToast('찜하기에 추가되었습니다.', 'success' as ToastType);
        }
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      showToast(
        '오류가 발생했습니다. 다시 시도해주세요.',
        'error' as ToastType
      );
    }
  };

  useEffect(() => {
    setIsBookmarked(initialIsBookmarked);
  }, [initialIsBookmarked]);

  return (
    <Button onClick={handleBookmark} className="flex items-center gap-2">
      <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-white' : ''}`} />
      <span>{isBookmarked ? '찜완료' : '찜하기'}</span>
    </Button>
  );
};

export default BookmarkButton;
