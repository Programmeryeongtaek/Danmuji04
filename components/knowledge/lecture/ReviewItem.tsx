'use client';

import { ReplyProps, ReviewItemProps } from '@/app/types/knowledge/lecture';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { StarRating } from './StarRating';
import { Heart, MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import { ReviewReply } from './ReviewReply';
import { useTimeLimit } from '@/app/hooks/useTimeLimit';
import {
  addReviewReply,
  deleteReview,
  toggleReviewLike,
  updateReview,
} from '@/utils/services/knowledge/reviewService';
import { getTodayTimeOrDate } from '@/utils/helpers/formatDate';

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
      await updateReview(review.id, editContent);
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
      await deleteReview(review.id);
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
      const newReply = await addReviewReply(review.id, replyContent);

      // addReviewReply 반환값의 타입을 더 구체적으로 정의
      type AddReviewReplyResponse = {
        id: number;
        content: string;
        created_at: string;
        user_id: string;
        user_profile: {
          id?: string;
          name: string;
          nickname?: string | null;
          avatar_url?: string | null;
        } | null;
        likes_count: number;
        is_liked: boolean;
      };

      const typedNewReply = newReply as AddReviewReplyResponse;

      // 타입 가드를 사용해서 안전하게 데이터 추출
      let userProfile = null;

      if (typedNewReply.user_profile) {
        // user_profile이 존재할 때 id 속성 체크
        userProfile = {
          id: typedNewReply.user_profile.id ?? typedNewReply.user_id,
          name: typedNewReply.user_profile.name,
          nickname: typedNewReply.user_profile.nickname ?? null,
          avatar_url: typedNewReply.user_profile.avatar_url ?? null,
        };
      }

      // ReplyProps 타입에 맞게 변환
      const formattedReply: ReplyProps = {
        id: typedNewReply.id,
        content: typedNewReply.content,
        created_at: typedNewReply.created_at,
        user_id: typedNewReply.user_id,
        user_profile: userProfile,
        likes_count: typedNewReply.likes_count,
        is_liked: typedNewReply.is_liked,
      };

      setReplies((prev) => [...prev, formattedReply]);
      setReplyContent('');
      setIsReplying(false);
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  // 누락된 handleReplyUpdate 함수 추가
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

  useEffect(() => {
    const loadReplies = async () => {
      // 1. 먼저 답글 데이터 조회
      const { data: fetchedReplies } = await supabase
        .from('review_replies')
        .select('*')
        .eq('review_id', review.id)
        .order('created_at', { ascending: true });

      if (fetchedReplies) {
        // 2. 프로필 정보 한 번에 조회
        const userIds = [
          ...new Set(fetchedReplies.map((reply) => reply.user_id)),
        ];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        // 3. 답글과 프로필 정보 결합
        const formattedReplies = fetchedReplies.map((reply) => {
          const userProfile = profileMap.get(reply.user_id);
          return {
            id: reply.id,
            content: reply.content,
            created_at: reply.created_at,
            user_id: reply.user_id,
            user_profile: userProfile
              ? {
                  id: userProfile.id,
                  name: userProfile.name || '익명',
                  nickname: userProfile.nickname,
                  avatar_url: userProfile.avatar_url,
                }
              : null,
            likes_count: 0,
            is_liked: false,
          };
        });

        setReplies(formattedReplies);
      }
    };

    loadReplies();
  }, [review.id, supabase]);

  // 함수로 URL 체크 및 생성
  const getValidImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('https://')) return url;
    return `https://hcqusfewtyxmpdvzpeor.supabase.co/storage/v1/object/public/avatars/${url}`;
  };

  return (
    <div className="mt-2 border-b pb-4">
      <div className="flex items-start gap-4">
        {/* 프로필 이미지 부분 수정 */}
        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
          {review.user_profile?.avatar_url ? (
            <Image
              src={
                getValidImageUrl(review.user_profile.avatar_url) ||
                '/images/default-avatar.png'
              }
              alt={
                review.user_profile?.nickname ||
                review.user_profile?.name ||
                '익명'
              }
              width={40}
              height={40}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/default-avatar.png';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-300 text-gray-500">
              {(
                review.user_profile?.nickname?.[0] ||
                review.user_profile?.name?.[0] ||
                '익명'
              ).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex justify-between">
            <div className="space-y-1">
              {/* 사용자 이름/닉네임 표시 부분 수정 */}
              <div className="font-medium">
                {review.user_profile?.nickname ||
                  review.user_profile?.name ||
                  '익명'}
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} size={16} readonly />
                <span className="text-sm text-gray-500">
                  {getTodayTimeOrDate(review.created_at)}
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
