'use client';

import { ReplyProps, ReviewItemProps } from '@/types/knowledge/lecture';
import {
  addReviewReply,
  createClient,
  deleteReview,
  toggleReviewLike,
  updateReview,
} from '@/utils/supabase/client';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { StarRating } from './StarRating';
import { Heart, MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import { ReviewReply } from './ReviewPeply';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTimeLimit } from '@/app/hooks/useTimeLimit';

export function ReviewItem({
  review,
  currentUserId,
  onDelete,
}: ReviewItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(review.content);
  const [replyContent, setReplyContent] = useState('');
  const [isLiked, setIsLiked] = useState(review.is_liked);
  const [likesCount, setLikesCount] = useState(review.likes_count);
  const [replies, setReplies] = useState(review.replies);
  const [content, setContent] = useState(review.content);
  const { checkTimeLimit } = useTimeLimit(24);
  const supabase = createClient();

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

  const handleEdit = async () => {
    if (!currentUserId) return;
    if (!editContent.trim()) return;

    try {
      await updateReview(review.id, currentUserId, editContent);
      setContent(editContent);
      setIsEditing(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('수정 중 오류가 발생했습니다.');
      }
      setEditContent(content);
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

  const handleEditClick = () => {
    if (checkTimeLimit(review.created_at)) {
      setIsEditing(true);
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
        likes_count: { count: 0 },
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
          ? { ...reply, is_liked: isLiked, likes_count: { count: likesCount } }
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

  useEffect(() => {
    const loadReplies = async () => {
      const { data: fetchedReplies } = await supabase
        .from('review_replies')
        .select('*, user:user_id(*)')
        .eq('review_id', review.id)
        .order('created_at', { ascending: true });

      if (fetchedReplies) {
        const formattedReplies = fetchedReplies.map((reply) => ({
          id: reply.id,
          content: reply.content,
          created_at: reply.created_at,
          user_id: reply.user_id,
          user_profile: reply.user
            ? {
                id: reply.user.id,
                user_name: reply.user.user_name || '익명',
                avatar_url: reply.user.avatar_url,
              }
            : null,
          likes_count: { count: 0 },
          is_liked: false,
        }));

        setReplies(formattedReplies);
      }
    };

    loadReplies();
  }, [review.id, supabase]);

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
                <>
                  <button
                    onClick={handleEditClick}
                    className="text-gray-500 hover:text-blue-500"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
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
                    setEditContent(content);
                  }}
                  className="flex items-center gap-1 rounded px-3 py-1 text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                  취소
                </button>
                <button
                  onClick={handleEdit}
                  className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                  disabled={!editContent.trim() || editContent === content}
                >
                  수정완료
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-gray-700">{content}</p>
          )}

          {replies.map((reply) => (
            <ReviewReply
              key={reply.id}
              reply={reply}
              currentUserId={currentUserId}
              onDelete={(replyId) => {
                setReplies((prev) => prev.filter((r) => r.id !== replyId));
              }}
              onUpdate={handleReplyUpdate}
              onEdit={(replyId, newContent) => {
                setReplies((prev) =>
                  prev.map((reply) =>
                    reply.id === replyId
                      ? { ...reply, content: newContent }
                      : reply
                  )
                );
              }}
            />
          ))}

          {isReplying && (
            <form
              id={`reply-form-${review.id}`}
              onSubmit={handleReplySubmit}
              className="mt-4"
            >
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
