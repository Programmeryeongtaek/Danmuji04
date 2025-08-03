'use client';

import { Comment } from '@/app/types/community/communityType';
import Button from '@/components/common/Button/Button';
import { Edit, ThumbsUp, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { memo, useMemo } from 'react';
import ReplyItem from './ReplyItem';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';
import { useToggleCommentLike } from '@/hooks/api/useCommentInteraction';

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
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: number, isReply?: boolean) => void; // isReply를 optional로 변경
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
  updateCommentLoading?: boolean;
  deleteCommentLoading?: boolean;
  createCommentLoading?: boolean;
}

const CommentItem = memo(
  ({
    comment,
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
    updateCommentLoading = false,
    deleteCommentLoading = false,
    createCommentLoading = false,
  }: CommentItemProps) => {
    const user = useAtomValue(userAtom);
    const { mutate: toggleCommentLike } = useToggleCommentLike();

    const setReplyMode = (commentId: number | null) => {
      setNewReply({
        commentId,
        content: '',
      });
    };

    // 댓글 좋아요 처리
    const handleCommentLike = (commentId: number) => {
      if (!user) {
        // 로그인 필요 시 처리 (부모 컴포넌트에서 모달 관리)
        return;
      }
      toggleCommentLike(commentId);
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
                  alt={comment.author_name || '사용자'}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                  {comment.author_name
                    ? comment.author_name.charAt(0).toUpperCase()
                    : '?'}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium">
                {comment.author_name || '사용자'}
              </div>
              <div className="text-xs text-gray-500">{formattedDate}</div>
            </div>
          </div>

          {/* 작성자만 보이는 수정/삭제 버튼 */}
          {isAuthor && (
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(comment)}
                className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
                disabled={updateCommentLoading}
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(comment.id, false)} // isReply: false 명시적으로 전달
                className="flex items-center gap-1 text-gray-500 hover:text-red-600"
                disabled={deleteCommentLoading}
              >
                {deleteCommentLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600"></div>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* 댓글 내용 - 수정 모드일 때와 일반 모드 */}
        {isEditing ? (
          <form onSubmit={onSubmitEdit} className="mb-3">
            <textarea
              value={editingComment?.content || ''}
              onChange={(e) =>
                setEditingComment(
                  editingComment
                    ? { ...editingComment, content: e.target.value }
                    : null
                )
              }
              className="mb-2 h-20 w-full resize-none rounded border p-2 focus:border-blue-500 focus:outline-none"
              disabled={updateCommentLoading}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                className="px-3 py-1 text-sm"
                disabled={updateCommentLoading}
              >
                {updateCommentLoading ? (
                  <div className="flex items-center">
                    <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    수정 중...
                  </div>
                ) : (
                  '수정'
                )}
              </Button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                disabled={updateCommentLoading}
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-3 whitespace-pre-wrap text-gray-800">
            {comment.content}
          </div>
        )}

        {/* 좋아요 및 답글 버튼 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleCommentLike(comment.id)}
            className={`flex items-center gap-1 text-sm ${
              likeStatus.isLiked
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-blue-600'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{likeStatus.likesCount}</span>
          </button>

          <button
            onClick={() => setReplyMode(isReplying ? null : comment.id)}
            className="text-sm text-gray-500 hover:text-blue-600"
          >
            답글
          </button>
        </div>

        {/* 답글 작성 폼 */}
        {isReplying && (
          <form
            onSubmit={(e) => onSubmitReply(e, comment.id)}
            className="ml-8 mt-4"
          >
            <textarea
              value={newReply.content}
              onChange={(e) =>
                setNewReply({ ...newReply, content: e.target.value })
              }
              placeholder="답글을 작성해주세요."
              className="mb-2 h-16 w-full resize-none rounded border p-2 focus:border-blue-500 focus:outline-none"
              disabled={createCommentLoading}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                className="px-3 py-1 text-sm"
                disabled={createCommentLoading || !newReply.content.trim()}
              >
                {createCommentLoading ? (
                  <div className="flex items-center">
                    <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    등록 중...
                  </div>
                ) : (
                  '답글 등록'
                )}
              </Button>
              <button
                type="button"
                onClick={() => setReplyMode(null)}
                className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                disabled={createCommentLoading}
              >
                취소
              </button>
            </div>
          </form>
        )}

        {/* 답글 목록 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-8 mt-4 space-y-3">
            {comment.replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                onEdit={() => onEdit(reply)}
                onDelete={() => onDelete(reply.id, true)}
                editingComment={editingComment}
                setEditingComment={setEditingComment}
                onCancelEdit={onCancelEdit}
                onSubmitEdit={onSubmitEdit}
                getCommentLikeStatus={getCommentLikeStatus}
                updateCommentLoading={updateCommentLoading}
                deleteCommentLoading={deleteCommentLoading}
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
