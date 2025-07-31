'user client';

import { ReviewReplyProps } from '@/app/types/knowledge/lecture';
import {} from '@/utils/supabase/client';
import { Heart, Pencil, Trash2, User, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';
import { useState } from 'react';
import { useTimeLimit } from '@/app/hooks/useTimeLimit';
import {
  deleteReviewReply,
  toggleReplyLike,
  updateReviewReply,
} from '@/utils/services/knowledge/reviewService';
import { getAvatarUrl } from '@/utils/common/avatarUtils';

export function ReviewReply({
  reply,
  currentUserId,
  onDelete,
  onUpdate,
  onEdit,
}: ReviewReplyProps) {
  const [isLiked, setIsLiked] = useState(reply.is_liked);
  const [likesCount, setLikesCount] = useState(reply.likes_count || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const { checkTimeLimit } = useTimeLimit(24);

  const avatarUrl = getAvatarUrl(reply.user_profile?.avatar_url);

  const userName =
    reply.user_profile?.nickname || reply.user_profile?.name || '익명';

  const handleDelete = async () => {
    if (!currentUserId) return;
    if (!window.confirm('답글을 삭제하시겠습니까?')) return;

    try {
      await deleteReviewReply(reply.id);
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
      const newCount = Math.max(0, likesCount + (newIsLiked ? 1 : -1));

      setIsLiked(newIsLiked);
      setLikesCount(newCount);
      onUpdate(reply.id, newIsLiked, newCount); // 바로 숫자 전달
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleEdit = async () => {
    if (!currentUserId) return;
    if (!editContent.trim()) return;

    try {
      await updateReviewReply(reply.id, currentUserId);
      onEdit(reply.id, editContent);
      setIsEditing(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('수정 중 오류가 발생했습니다.');
      }
      setEditContent(reply.content);
    }
  };

  const handleEditClick = () => {
    if (checkTimeLimit(reply.created_at)) {
      setIsEditing(true);
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
                alt={reply.user_profile?.nickname || '익명'}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-gray-400" />
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
            <>
              <button
                onClick={handleEditClick}
                className="text-gray-500 hover:text-blue-500"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={handleDelete}
                className="text-gray-500 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="mt-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded border p-2"
            rows={3}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(reply.content);
              }}
              className="flex items-center gap-1 rounded px-3 py-1 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
              취소
            </button>
            <button
              onClick={handleEdit}
              className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
              disabled={!editContent.trim() || editContent === reply.content}
            >
              수정완료
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-gray-700">{reply.content}</p>
      )}
    </div>
  );
}
