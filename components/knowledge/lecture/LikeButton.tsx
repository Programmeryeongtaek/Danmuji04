'use client';

import Button from '@/components/common/Button/Button';
import { createClient } from '@/utils/supabase/client';
import { Heart } from 'lucide-react';
import { useState } from 'react';

interface LikeButtonProps {
  lectureId: number;
  initialLikeCount: number;
  initialIsLiked: boolean;
}

const LikeButton = ({
  lectureId,
  initialLikeCount,
  initialIsLiked,
}: LikeButtonProps) => {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  const handleLike = async () => {
    const supabase = createClient();

    if (isLiked) {
      // 좋아요 취소
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('lecture_id', lectureId);

      if (!error) {
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      }
    } else {
      // 좋아요 추가
      const { error } = await supabase
        .from('likes')
        .insert([{ lecture_id: lectureId }]);

      if (!error) {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    }
  };

  return (
    <Button onClick={handleLike}>
      <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500' : ''} `} />
      <span>{likeCount}</span>
    </Button>
  );
};

export default LikeButton;
