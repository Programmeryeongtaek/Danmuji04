'use client';

import Button from '@/components/common/Button/Button';
import { User } from '@supabase/supabase-js';
import { FormEvent, memo } from 'react';
import CommentItem from './CommentItem';
import {
  Comment,
  EditingComment,
  NewReply,
} from '@/app/types/community/communityType';

interface CommentsSectionProps {
  comments: Comment[];
  user: User | null;
  newComment: string;
  setNewComment: (value: string) => void;
  onSubmitComment: (e: React.FormEvent) => void;
  onCommentLike: (commentId: number) => void;
  onEditComment: (comment: Comment, isReply?: boolean) => void;
  onDeleteComment: (
    commentId: number,
    isReply?: boolean,
    parentId?: number
  ) => void;
  onSubmitReply: (e: React.FormEvent, commentId: number) => void;
  editingComment: EditingComment | null;
  setEditingComment: (value: EditingComment | null) => void;
  newReply: NewReply;
  setNewReply: (value: NewReply) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (e: React.FormEvent) => void;
  onLoginRequired: () => void;
  getCommentLikeStatus: (commentId: number) => {
    isLiked: boolean;
    likesCount: number;
  };
}

const CommentsSection = memo(
  ({
    comments,
    user,
    newComment,
    setNewComment,
    onSubmitComment,
    onCommentLike,
    onEditComment,
    onDeleteComment,
    onSubmitReply,
    editingComment,
    setEditingComment,
    newReply,
    setNewReply,
    onCancelEdit,
    onSubmitEdit,
    getCommentLikeStatus,
  }: CommentsSectionProps) => {
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
          />
          <div className="flex justify-end">
            <Button type="submit" className="px-4 py-2">
              작성
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
                user={user}
                onLike={onCommentLike}
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
