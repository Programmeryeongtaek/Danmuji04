'use client';

import {
  Comment,
  EditingComment,
  LikeStatus,
  NewReply,
  Post,
} from '@/app/types/community/communityType';
import { useToast } from '@/components/common/Toast/Context';
import CommentsSection from '@/components/community/comments/CommentsSections';
import PostContent from '@/components/community/post/PostContent';
import PostHeader from '@/components/community/post/PostHeader';
import RelatedPosts from '@/components/community/post/RelatedPosts';
import LoginModal from '@/components/home/LoginModal';
import { useBookmarkStatus, useToggleBookmark } from '@/hooks/api/useBookmarks';
import { useCommentsLikeStatus } from '@/hooks/api/useCommentInteraction';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
  useValidateCommentDeletion,
} from '@/hooks/api/useComments';
import {
  usePostLikeStatus,
  useTogglePostLike,
} from '@/hooks/api/usePostInteractions';
import { userAtom } from '@/store/auth';
import {
  initializePostViewCountsAtom,
  viewPostAtom,
} from '@/store/community/postViewAtom';
import {
  deletePost,
  fetchPostById,
  fetchRelatedPosts,
} from '@/utils/services/community/postService';
import { useAtom, useAtomValue } from 'jotai';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const numericPostId = parseInt(postId, 10);
  const { showToast } = useToast();

  const user = useAtomValue(userAtom);

  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<EditingComment | null>(
    null
  );
  const [newReply, setNewReply] = useState<NewReply>({
    commentId: null,
    content: '',
  });

  const { data: comments = [], isLoading: commentsLoading } =
    useComments(numericPostId);
  const { data: postLikeStatus } = usePostLikeStatus(numericPostId);
  const { data: bookmarkStatus } = useBookmarkStatus(numericPostId, 'post');
  const { mutate: togglePostLike } = useTogglePostLike();
  const { mutate: toggleBookmark } = useToggleBookmark();

  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  const validateCommentDeletion = useValidateCommentDeletion();

  // 댓글 ID 목록 추출
  const allCommentIds = comments.flatMap((comment) => [
    comment.id,
    ...(comment.replies?.map((reply) => reply.id) || []),
  ]);

  const { data: commentsLikeStatus } = useCommentsLikeStatus(allCommentIds);

  // 조회수 관련은 유지
  const [, initializePostViewCounts] = useAtom(initializePostViewCountsAtom);
  const [, viewPost] = useAtom(viewPostAtom);

  // 이미지 preload 함수
  const preloadFirstImage = useCallback((content: string) => {
    const imageLinkRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
    const match = content.match(imageLinkRegex);

    if (match && match[2]) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = match[2];
      link.fetchPriority = 'high';
      document.head.appendChild(link);

      const dnsLink = document.createElement('link');
      dnsLink.rel = 'dns-prefetch';
      dnsLink.href = new URL(match[2]).origin;
      document.head.appendChild(dnsLink);

      return () => {
        document.head.removeChild(link);
        document.head.removeChild(dnsLink);
      };
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    const fetchPostData = async () => {
      try {
        setIsLoading(true);

        if (isNaN(numericPostId)) {
          router.push('/community?error=post-not-found');
          return;
        }

        const postData = await fetchPostById(numericPostId, false);
        if (!postData) {
          router.push('/community?error=post-not-found');
          return;
        }

        setPost(postData);

        // 조회수 관련 처리
        if (postData) {
          await initializePostViewCounts([
            { id: postData.id, views: postData.views },
          ]);
          await viewPost(postData.id);
        }

        // 첫 번째 이미지 preload
        let cleanupPreload: (() => void) | undefined;
        if (postData.content) {
          cleanupPreload = preloadFirstImage(postData.content);
        }

        // 관련 게시글 백그라운드 로드
        if (
          postData.tags &&
          Array.isArray(postData.tags) &&
          postData.tags.length > 0
        ) {
          fetchRelatedPosts(numericPostId, 3)
            .then(setRelatedPosts)
            .catch(console.error);
        }

        return cleanupPreload;
      } catch (error) {
        console.error('게시글 데이터 로드 실패:', error);
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
        router.push('/community');
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      const cleanup = fetchPostData();
      return () => {
        cleanup?.then((cleanupFn) => cleanupFn?.());
      };
    }
  }, [
    postId,
    router,
    showToast,
    numericPostId,
    initializePostViewCounts,
    viewPost,
    preloadFirstImage,
  ]);

  // TanStack Query v5: mutation 성공 시 상태 초기화를 useEffect로 처리
  useEffect(() => {
    if (createCommentMutation.isSuccess) {
      setNewComment('');
      setNewReply({ commentId: null, content: '' });
    }
  }, [createCommentMutation.isSuccess]);

  useEffect(() => {
    if (updateCommentMutation.isSuccess) {
      setEditingComment(null);
    }
  }, [updateCommentMutation.isSuccess]);

  // 좋아요 처리
  const handleLike = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!post) return;
    togglePostLike(post.id);
  };

  // 북마크 처리
  const handleBookmark = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!post) return;
    toggleBookmark({ id: post.id, type: 'post' });
  };

  // 공유하기
  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        showToast('링크가 클립보드에 복사되었습니다!', 'success');
      })
      .catch(() => {
        showToast('링크 복사에 실패했습니다.', 'error');
      });
  };

  // 게시글 수정
  const handleEditPost = () => {
    if (!post) return;
    router.push(`/community/post/${post.id}/edit`);
  };

  // 게시글 삭제
  const handleDeletePost = async () => {
    if (!post) return;
    if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    try {
      setIsLoading(true);
      const success = await deletePost(post.id);

      if (success) {
        showToast('게시글이 성공적으로 삭제되었습니다.', 'success');
        router.push('/community');
      } else {
        throw new Error('게시글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      showToast('게시글 삭제에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 댓글 작성 - TanStack Query 방식
  const handleSubmitComment = (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!newComment.trim() || !post) return;

    createCommentMutation.mutate({
      postId: numericPostId,
      content: newComment,
    });
  };

  // 댓글 수정 시작
  const handleEditComment = (comment: Comment, isReply: boolean = false) => {
    setEditingComment({
      id: comment.id,
      content: comment.content,
      isReply,
    });
  };

  // 댓글 수정 취소
  const handleCancelEdit = () => {
    setEditingComment(null);
  };

  // 댓글 수정 제출 - TanStack Query 방식
  const handleSubmitEdit = (e: FormEvent) => {
    e.preventDefault();

    if (!editingComment) return;

    updateCommentMutation.mutate({
      commentId: editingComment.id,
      content: editingComment.content,
    });
  };

  // 댓글 삭제 - TanStack Query 방식
  const handleDeleteComment = (commentId: number, isReply: boolean = false) => {
    const comment = comments.find((c) => {
      if (c.id === commentId) return c;
      return c.replies?.find((r) => r.id === commentId);
    });

    const targetComment =
      comment?.id === commentId
        ? comment
        : comment?.replies?.find((r) => r.id === commentId);

    if (!targetComment) return;

    // 삭제 전 검증
    if (!validateCommentDeletion(targetComment, isReply)) {
      return;
    }

    deleteCommentMutation.mutate({
      commentId,
    });
  };

  // 답글 제출 - TanStack Query 방식
  const handleSubmitReply = (e: React.FormEvent, commentId: number) => {
    e.preventDefault();

    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!newReply.content.trim() || !post) return;

    createCommentMutation.mutate({
      postId: numericPostId,
      content: newReply.content,
      parentId: commentId,
    });
  };

  // 댓글별 좋아요 상태 가져오기
  const getCommentLikeStatus = (commentId: number) => {
    return commentsLikeStatus?.[commentId] || { isLiked: false, likesCount: 0 };
  };

  // 로딩 상태
  if (isLoading && !post) {
    return (
      <div className="mx-auto max-w-4xl mobile:p-4 tablet:p-6">
        <div className="mobile:mb-4 tablet:mb-6">
          <Link
            href="/community"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </div>

        <div className="animate-pulse mobile:mb-4 tablet:mb-6 laptop:mb-8">
          <div className="mb-4 rounded bg-gray-200 mobile:h-8 tablet:h-9"></div>
          <div className="mb-6 h-10 rounded bg-gray-200"></div>
          <div className="mb-8 h-[480px] rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold">게시글을 찾을 수 없습니다</h1>
        <Link href="/community" className="text-blue-500 hover:underline">
          돌아가기
        </Link>
      </div>
    );
  }

  const isOwner = user && user.id === post.author_id;

  const likeStatus: LikeStatus = {
    isLiked: postLikeStatus?.isLiked || false,
    likesCount: postLikeStatus?.likesCount || 0,
  };
  const bookmarkStatusValue = bookmarkStatus?.isBookmarked || false;

  return (
    <div className="mx-auto max-w-4xl mobile:p-4 tablet:p-6">
      {/* 뒤로가기 버튼 */}
      <div className="mobile:mb-4 tablet:mb-6">
        <Link
          href="/community"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </div>

      {/* 게시글 헤더 */}
      <PostHeader
        post={post}
        likeStatus={likeStatus}
        bookmarkStatus={bookmarkStatusValue}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onShare={handleShare}
      />

      {/* 게시글 본문 */}
      <PostContent
        content={post.content}
        isOwner={!!isOwner}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        isFirstImagePreloaded={true}
      />

      {/* 태그 */}
      {post.tags && post.tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {post.tags.map((tag, idx) => (
            <Link
              key={idx}
              href={`/community?tag=${tag}`}
              className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* 관련 게시글 */}
      {relatedPosts.length > 0 && <RelatedPosts posts={relatedPosts} />}

      {/* 댓글 섹션 - TanStack Query 방식 */}
      <CommentsSection
        comments={comments}
        isLoading={commentsLoading}
        newComment={newComment}
        setNewComment={setNewComment}
        onSubmitComment={handleSubmitComment}
        editingComment={editingComment}
        setEditingComment={setEditingComment}
        onEditComment={handleEditComment}
        onCancelEdit={handleCancelEdit}
        onSubmitEdit={handleSubmitEdit}
        onDeleteComment={handleDeleteComment}
        newReply={newReply}
        setNewReply={setNewReply}
        onSubmitReply={handleSubmitReply}
        getCommentLikeStatus={getCommentLikeStatus}
        createCommentLoading={createCommentMutation.isPending}
        updateCommentLoading={updateCommentMutation.isPending}
        deleteCommentLoading={deleteCommentMutation.isPending}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
