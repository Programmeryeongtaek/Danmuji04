'use client';

import { Comment, Profile } from '@/app/types/community/communityType';
import Button from '@/components/common/Button/Button';
import { Edit, ThumbsUp, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { memo, useMemo } from 'react';
import ReplyItem from './ReplyItem';

interface EditingComment {
  id: number;
  content: string;
  isReply: boolean;
}

interface NewReply {
  commentId: number | null;
  content: string;
}

interface CommentItemProps {
  comment: Comment;
  user: Profile | null;
  onLike: (commentId: number) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: number) => void;
  onSubmitReply: (e: React.FormEvent, commentId: number) => void;
  editingComment: EditingComment | null;
  setEditingComment: (value: EditingComment | null) => void;
  newReply: NewReply;
  setNewReply: (value: NewReply) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (e: React.FormEvent) => void;
  getCommentLikeStatus: (commentId: number) => {
    isLiked: boolean;
    likesCount: number;
  };
}

const CommentItem = memo(
  ({
    comment,
    user,
    onLike,
    onEdit,
    onDelete,
    onSubmitReply,
    editingComment,
    setEditingComment,
    newReply,
    setNewReply,
    onCancelEdit,
    onSubmitEdit,
    getCommentLikeStatus,
  }: CommentItemProps) => {
    const setReplyMode = (commentId: number | null) => {
      setNewReply({
        commentId,
        content: '',
      });
    };

    // 계산 최적화
    const isAuthor = useMemo(
      () => user && user.id === comment.author_id,
      [user?.id, comment.author_id]
    );

    const isEditing = useMemo(
      () => editingComment && editingComment.id === comment.id,
      [editingComment?.id, comment.id]
    );

    const isReplying = useMemo(
      () => newReply.commentId === comment.id,
      [newReply.commentId, comment.id]
    );

    const formattedDate = useMemo(() => {
      const date = new Date(comment.created_at);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [comment.created_at]);

    const likeStatus = useMemo(
      () => getCommentLikeStatus(comment.id),
      [getCommentLikeStatus, comment.id]
    );

    return (
      <div className="rounded-lg border p-4">
        {/* 댓글 작성자 정보 */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200">
              {comment.author_avatar ? (
                <Image
                  src={comment.author_avatar}
                  alt={comment.author_name || ''}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  {comment.author_name
                    ? comment.author_name.charAt(0).toUpperCase()
                    : '?'}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium">{comment.author_name}</div>
              <div className="text-xs text-gray-500">{formattedDate}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-sm ${
                likeStatus.isLiked
                  ? 'text-gold-start'
                  : 'text-gray-500 hover:text-gold-start'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>{likeStatus.likesCount}</span>
            </button>

            {isAuthor && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(comment)}
                  className="text-sm text-gray-500 hover:text-blue-500"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-sm text-gray-500 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 댓글 내용 - 수정 모드인 경우 수정 폼 표시 */}
        {isEditing && editingComment ? (
          <form onSubmit={onSubmitEdit} className="pl-10">
            <textarea
              value={editingComment.content}
              onChange={(e) =>
                setEditingComment({
                  ...editingComment,
                  content: e.target.value,
                })
              }
              className="mb-2 h-20 w-full resize-none rounded-lg border p-3 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-3 py-1 text-sm text-white"
              >
                완료
              </button>
            </div>
          </form>
        ) : (
          <div className="whitespace-pre-line pl-10 text-gray-800">
            {comment.content}
            {comment.updated_at !== comment.created_at && (
              <span
                className="ml-2 cursor-help text-xs text-gray-500"
                title={`수정 시간: ${formattedDate}`}
              >
                (수정됨)
              </span>
            )}
          </div>
        )}

        {/* 답글 버튼 */}
        <div className="mt-2 flex justify-end">
          {isReplying ? (
            <button
              onClick={() => setReplyMode(null)}
              className="text-sm text-gray-500 hover:text-red-500"
            >
              취소
            </button>
          ) : (
            <button
              onClick={() => setReplyMode(comment.id)}
              className="text-sm text-gray-500 hover:text-gold-start"
            >
              답글
            </button>
          )}
        </div>

        {/* 답글 작성 폼 */}
        {isReplying && (
          <form
            onSubmit={(e) => onSubmitReply(e, comment.id)}
            className="mt-3 pl-10"
          >
            <textarea
              value={newReply.content}
              onChange={(e) =>
                setNewReply({
                  commentId: comment.id,
                  content: e.target.value,
                })
              }
              placeholder="답글을 작성해주세요."
              className="mb-2 h-20 w-full resize-none rounded-lg border p-3 text-sm focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
            />
            <div className="flex justify-end">
              <Button type="submit" className="px-3 py-1 text-sm">
                작성
              </Button>
            </div>
          </form>
        )}

        {/* 답글이 있는 경우 렌더링 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4 rounded-lg bg-gray-50 p-4">
            {comment.replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                user={user}
                parentId={comment.id}
                onLike={onLike}
                onEdit={onEdit}
                onDelete={onDelete}
                editingComment={editingComment}
                setEditingComment={setEditingComment}
                onCancelEdit={onCancelEdit}
                onSubmitEdit={onSubmitEdit}
                getCommentLikeStatus={getCommentLikeStatus}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

CommentItem.displayName = 'CommentItem';

export default CommentItem;
