'use client';

import { ReplyProps, ReviewItemProps } from '@/types/knowledge/lecture';
import {
  addReviewReply,
  deleteReview,
  toggleReviewLike,
} from '@/utils/supabase/client';
import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { StarRating } from './StarRating';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { ReviewReply } from './ReviewPeply';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function ReviewItem({
  review,
  currentUserId,
  onDelete,
}: ReviewItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isLiked, setIsLiked] = useState(review.is_liked);
  const [likesCount, setLikesCount] = useState(review.likes_count);
  const [replies, setReplies] = useState(review.replies);

  const handleLike = async () => {
    if (!currentUserId) return;
    try {
      await toggleReviewLike(review.id, currentUserId);
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async () => {
    if (!currentUserId) return;
    if (!window.confirm('수강평을 삭제하시겠습니까?')) return;
    onDelete(review.id);

    try {
      await deleteReview(review.id, currentUserId);
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !replyContent.trim()) return;

    try {
      const newReply = await addReviewReply(
        review.id,
        currentUserId,
        replyContent
      );

      // user_profile 타입 안전하게 처리
      const userProfile = {
        id: currentUserId,
        user_name: review.user_profile?.user_name || '익명',
        avatar_url: review.user_profile?.avatar_url || null,
      } as const;

      const formattedReply: ReplyProps = {
        id: newReply.id,
        content: newReply.content,
        created_at: newReply.created_at,
        user_id: currentUserId,
        user_profile: userProfile,
        likes_count: 0,
        is_liked: false,
      };

      setReplies((prev) => [...prev, formattedReply]);
      setReplyContent('');
      setIsReplying(false);
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  const handleReplyUpdate = (
    replyId: number,
    isLiked: boolean,
    likesCount: number
  ) => {
    setReplies((prev) =>
      prev.map((reply) =>
        reply.id === replyId
          ? { ...reply, is_liked: isLiked, likes_count: likesCount }
          : reply
      )
    );
  };

  const handleReplyClick = () => {
    setIsReplying(!isReplying);

    if (!isReplying) {
      setTimeout(() => {
        const replyForm = document.getElementById(`reply-form-${review.id}`);
        if (replyForm) {
          const windowHeight = window.innerHeight;
          const formRect = replyForm.getBoundingClientRect();
          const scrollPosition =
            window.scrollY +
            formRect.top -
            (windowHeight - formRect.height - 150);

          window.scrollTo({
            top: scrollPosition,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  };

  return (
    <div className="border-b pb-6">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
          {review.user_profile?.avatar_url ? (
            <Image
              src={review.user_profile.avatar_url}
              alt={review.user_profile.user_name}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-300 text-gray-500">
              {review.user_profile?.user_name || '익명'}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex justify-between">
            <div className="space-y-1">
              <div className="font-medium">
                {review.user_profile?.user_name ?? '익명'}
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} size={16} readonly />
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(review.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
              >
                <Heart
                  className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                />
                <span>{likesCount}</span>
              </button>
              <button
                onClick={handleReplyClick}
                className="text-gray-500 hover:text-gray-700"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              {review.user_id === currentUserId && (
                <button
                  onClick={handleDelete}
                  className="text-gray-500 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <p className="mt-2 text-gray-700">{review.content}</p>

          {replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {replies.map((reply) => (
                <ReviewReply
                  key={reply.id}
                  reply={reply}
                  currentUserId={currentUserId}
                  onDelete={(replyId) => {
                    setReplies((prev) => prev.filter((r) => r.id !== replyId));
                  }}
                  onUpdate={handleReplyUpdate}
                />
              ))}
            </div>
          )}

          {isReplying && (
            <form onSubmit={handleReplySubmit} className="mt-4">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="w-full rounded border p-2"
                placeholder="답글을 작성해주세요"
                rows={3}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplying(false)}
                  className="rounded px-4 py-2 text-gray-500 hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  disabled={!replyContent.trim()}
                >
                  답글 작성
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
