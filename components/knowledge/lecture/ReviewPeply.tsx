'user client';

import { ReviewReplyProps } from '@/types/knowledge/lecture';
import { deleteReviewReply, toggleReplyLike } from '@/utils/supabase/client';
import { Heart, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';
import { useState } from 'react';

export function ReviewReply({
  reply,
  currentUserId,
  onDelete,
  onUpdate,
}: ReviewReplyProps) {
  const [isLiked, setIsLiked] = useState(reply.is_liked);
  const [likesCount, setLikesCount] = useState(reply.likes_count);

  const avatarUrl = reply.user_profile?.avatar_url;
  const userName = reply.user_profile?.user_name || '익명';

  const handleDelete = async () => {
    if (!currentUserId) return;
    if (!window.confirm('답글을 삭제하시겠습니까?')) return;

    try {
      await deleteReviewReply(reply.id, currentUserId);
      onDelete(reply.id);
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) return;
    try {
      await toggleReplyLike(reply.id, currentUserId);
      const newIsLiked = !isLiked;
      const newLikesCount = likesCount + (newIsLiked ? 1 : -1);

      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);
      onUpdate(reply.id, newIsLiked, newLikesCount);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="ml-8 border-l-2 border-gray-200 pl-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={userName}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-300 text-gray-500">
                {userName[0]}
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{userName}</div>
            <div className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(reply.created_at), {
                addSuffix: true,
                locale: ko,
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
          >
            <Heart
              className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
            />
            <span className="text-sm">{likesCount}</span>
          </button>
          {reply.user_id === currentUserId && (
            <button
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-gray-700">{reply.content}</p>
    </div>
  );
}
