'use client';

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
          .eq('lecture_id', lectureId)
          .eq('user_id', user.id);

        if (!error) {
          setIsBookmarked(false);
          showToast('찜하기가 취소되었습니다.', 'success' as ToastType);
        }
      } else {
        // 찜하기 추가
        const { error } = await supabase.from('bookmarks').insert([
          {
            lecture_id: lectureId,
            user_id: user.id,
          },
        ]); // upsert 대신 단순 insert 사용

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
    <button onClick={handleBookmark} className="flex items-center gap-2 p-2">
      <Bookmark
        className={`h-5 w-5 ${isBookmarked ? 'fill-gold-start text-gold-start' : ''}`}
      />
    </button>
  );
};

export default BookmarkButton;
