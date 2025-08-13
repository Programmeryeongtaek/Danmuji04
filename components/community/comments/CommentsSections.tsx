'use client';

import Button from '@/components/common/Button/Button';
import { FormEvent, memo } from 'react';
import CommentItem from './CommentItem';
import {
  Comment,
  EditingComment,
  NewReply,
} from '@/app/types/community/communityType';

interface CommentsSectionProps {
  comments: Comment[];
  isLoading?: boolean;
  newComment: string;
  setNewComment: (value: string) => void;
  onSubmitComment: (e: React.FormEvent) => void;
  editingComment: EditingComment | null;
  setEditingComment: (value: EditingComment | null) => void;
  onEditComment: (comment: Comment, isReply?: boolean) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (e: React.FormEvent) => void;
  onDeleteComment: (
    commentId: number,
    isReply?: boolean,
    parentId?: number
  ) => void;
  newReply: NewReply;
  setNewReply: (value: NewReply) => void;
  onSubmitReply: (e: React.FormEvent, commentId: number) => void;
  getCommentLikeStatus: (commentId: number) => {
    isLiked: boolean;
    likesCount: number;
  };
  createCommentLoading?: boolean;
  updateCommentLoading?: boolean;
  deleteCommentLoading?: boolean;
}

const CommentsSection = memo(
  ({
    comments,
    isLoading = false,
    newComment,
    setNewComment,
    onSubmitComment,
    editingComment,
    setEditingComment,
    onEditComment,
    onCancelEdit,
    onSubmitEdit,
    onDeleteComment,
    newReply,
    setNewReply,
    onSubmitReply,
    getCommentLikeStatus,
    createCommentLoading = false,
    updateCommentLoading = false,
    deleteCommentLoading = false,
  }: CommentsSectionProps) => {
    if (isLoading) {
      return (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-bold">댓글</h2>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            <span className="ml-2 text-gray-600">댓글을 불러오는 중...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold">댓글 {comments.length}개</h2>

        {/* 댓글 입력 */}
        <form onSubmit={onSubmitComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 작성해주세요."
            className="mb-2 h-24 w-full resize-none rounded-lg border p-3 focus:border-gold-start focus:bg-light focus:outline-none focus:ring-1 focus:ring-gold-start"
            disabled={createCommentLoading}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              className="px-4 py-2"
              disabled={createCommentLoading || !newComment.trim()}
            >
              {createCommentLoading ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  작성 중...
                </div>
              ) : (
                '작성'
              )}
            </Button>
          </div>
        </form>

        {/* 댓글 목록 */}
        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
                onSubmitReply={onSubmitReply}
                editingComment={editingComment}
                setEditingComment={setEditingComment}
                newReply={newReply}
                setNewReply={setNewReply}
                onCancelEdit={onCancelEdit}
                onSubmitEdit={onSubmitEdit}
                getCommentLikeStatus={getCommentLikeStatus}
                updateCommentLoading={updateCommentLoading}
                deleteCommentLoading={deleteCommentLoading}
                createCommentLoading={createCommentLoading}
              />
            ))
          ) : (
            <div className="py-10 text-center text-gray-500">
              아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
            </div>
          )}
        </div>
      </div>
    );
  }
);

CommentsSection.displayName = 'CommentsSection';

export default CommentsSection;
