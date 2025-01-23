'user client';

import { ReviewReplyProps } from '@/types/knowledge/lecture';
import { deleteReviewReply } from '@/utils/supabase/client';
import { Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';

export function ReviewReply({
  reply,
  currentUserId,
  onDelete,
}: ReviewReplyProps) {
  const handleDelete = async () => {
    if (!currentUserId || !window.confirm('답글을 삭제하시겠습니까?')) return;

    try {
      await deleteReviewReply(reply.id, currentUserId);
      onDelete(reply.id);
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  return (
    <div className="ml-8 border-l-2 border-gray-200 pl-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200">
            {reply.user_profile.avatar_url ? (
              <Image
                src={reply.user_profile.avatar_url}
                alt={reply.user_profile.user_name}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-300 text-gray-500">
                {reply.user_profile.user_name[0]}
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{reply.user_profile.user_name}</div>
            <div className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(reply.created_at), {
                addSuffix: true,
                locale: ko,
              })}
            </div>
          </div>
        </div>
        {reply.user_profile.id === currentUserId && (
          <button
            onClick={handleDelete}
            className="text-gray-500 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-gray-700">{reply.content}</p>
    </div>
  );
}
