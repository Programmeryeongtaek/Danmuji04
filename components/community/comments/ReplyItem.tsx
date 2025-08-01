'use client';
import {
  Comment,
  EditingComment,
  Profile,
} from '@/app/types/community/communityType';
import { Edit, ThumbsUp, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { memo, useMemo } from 'react';

interface ReplyItemProps {
  reply: Comment;
  user: Profile | null;
  parentId: number;
  onLike: (commentId: number) => void;
  onEdit: (comment: Comment, isReply: boolean) => void;
  onDelete: (commentId: number, isReply: boolean, parentId: number) => void;
  editingComment: EditingComment | null;
  setEditingComment: (value: EditingComment | null) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (e: React.FormEvent) => void;
  getCommentLikeStatus: (commentId: number) => {
    isLiked: boolean;
    likesCount: number;
  };
}

const ReplyItem = memo(
  ({
    reply,
    user,
    parentId,
    onLike,
    onEdit,
    onDelete,
    editingComment,
    setEditingComment,
    onCancelEdit,
    onSubmitEdit,
    getCommentLikeStatus,
  }: ReplyItemProps) => {
    // 계산 최적화
    const isAuthor = useMemo(
      () => user && user.id === reply.author_id,
      [user?.id, reply.author_id]
    );

    const isEditing = useMemo(
      () => editingComment && editingComment.id === reply.id,
      [editingComment?.id, reply.id]
    );

    const likeStatus = useMemo(
      () => getCommentLikeStatus(reply.id),
      [getCommentLikeStatus, reply.id]
    );

    const formattedDate = useMemo(() => {
      const date = new Date(reply.created_at);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [reply.created_at]);

    return (
      <div className="border-t border-gray-200 pt-4 first:border-0 first:pt-0">
        {/* 답글 작성자 정보 */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
              {reply.author_avatar ? (
                <Image
                  src={reply.author_avatar}
                  alt={reply.author_name || ''}
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  {reply.author_name
                    ? reply.author_name.charAt(0).toUpperCase()
                    : '?'}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-medium">{reply.author_name}</div>
              <div className="text-xs text-gray-500">{formattedDate}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onLike(reply.id)}
              className={`flex items-center gap-1 text-sm ${
                likeStatus.isLiked
                  ? 'text-gold-start'
                  : 'text-gray-500 hover:text-gold-start'
              }`}
            >
              <ThumbsUp className="h-3 w-3" />
              <span>{likeStatus.likesCount}</span>
            </button>

            {isAuthor && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => onEdit(reply, true)}
                  className="text-gray-500 hover:text-blue-500"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(reply.id, true, parentId)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 답글 내용 - 수정 모드인 경우 수정 폼 표시 */}
        {isEditing && editingComment ? (
          <form onSubmit={onSubmitEdit} className="pl-8">
            <textarea
              value={editingComment.content}
              onChange={(e) =>
                setEditingComment({
                  ...editingComment,
                  content: e.target.value,
                })
              }
              className="mb-2 h-16 w-full resize-none rounded-lg border p-2 text-sm focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-2 py-1 text-xs text-white"
              >
                저장
              </button>
            </div>
          </form>
        ) : (
          <div className="whitespace-pre-line pl-8 text-sm text-gray-800">
            {reply.content}
            {reply.updated_at !== reply.created_at && (
              <span
                className="ml-2 cursor-help text-xs text-gray-500"
                title={`수정 시간: ${formattedDate}`}
              >
                (수정됨)
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

ReplyItem.displayName = 'ReplyItem';

export default ReplyItem;
