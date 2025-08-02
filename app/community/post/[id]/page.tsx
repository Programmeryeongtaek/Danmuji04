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
import {
  useCommentsLikeStatus,
  useInvalidateCommentCache,
  useToggleCommentLike,
} from '@/hooks/api/useCommentInteraction';
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
  createComment,
  deleteComment,
  fetchCommentsByPostId,
  updateComment,
} from '@/utils/services/community/commentService';
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
  const [comments, setComments] = useState<Comment[]>([]);
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

  const { data: postLikeStatus } = usePostLikeStatus(numericPostId);
  const { data: bookmarkStatus } = useBookmarkStatus(numericPostId, 'post');
  const { mutate: togglePostLike } = useTogglePostLike();
  const { mutate: toggleBookmark } = useToggleBookmark();

  // 댓글 ID 목록 추출
  const allCommentIds = comments.flatMap((comment) => [
    comment.id,
    ...(comment.replies?.map((reply) => reply.id) || []),
  ]);

  const { data: commentsLikeStatus } = useCommentsLikeStatus(allCommentIds);
  const { mutate: toggleCommentLike } = useToggleCommentLike();
  const invalidateCommentCache = useInvalidateCommentCache();

  // 조회수 관련은 유지 (아직 마이그레이션 안함)
  const [, initializePostViewCounts] = useAtom(initializePostViewCountsAtom);
  const [, viewPost] = useAtom(viewPostAtom);

  // 이미지 preload 함수
  const preloadFirstImage = useCallback((content: string) => {
    const imageLinkRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
    const match = content.match(imageLinkRegex);

    if (match && match[2]) {
      // 첫 번째 이미지를 preload
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = match[2];
      link.fetchPriority = 'high';
      document.head.appendChild(link);

      // DNS prefetch도 추가
      const dnsLink = document.createElement('link');
      dnsLink.rel = 'dns-prefetch';
      dnsLink.href = new URL(match[2]).origin;
      document.head.appendChild(dnsLink);

      // 정리 함수 반환
      return () => {
        document.head.removeChild(link);
        document.head.removeChild(dnsLink);
      };
    }
  }, []);

  // 초기 데이터 로드 - 최적화됨
  useEffect(() => {
    const fetchPostData = async () => {
      try {
        setIsLoading(true);

        if (isNaN(numericPostId)) {
          router.push('/community?error=post-not-found');
          return;
        }

        // 1. 게시글 먼저 로드
        const postData = await fetchPostById(numericPostId, false);
        if (!postData) {
          router.push('/community?error=post-not-found');
          return;
        }

        setPost(postData);

        // 조회수 관련 처리 추가
        if (postData) {
          // 전역 상태에 조회수 초기화
          await initializePostViewCounts([
            { id: postData.id, views: postData.views },
          ]);

          // 조회수 증가 처리 (중복 렌더링 자동 방지)
          await viewPost(postData.id);
        }

        // 2. 첫 번째 이미지 preload (게시글 설정 직후)
        let cleanupPreload: (() => void) | undefined;
        if (postData.content) {
          cleanupPreload = preloadFirstImage(postData.content);
        }

        // 3. 댓글과 관련 게시글은 백그라운에서 로드
        Promise.all([
          fetchCommentsByPostId(numericPostId),
          fetchRelatedPosts(numericPostId),
        ])
          .then(async ([commentsData, relatedPostsData]) => {
            setComments(commentsData);
            setRelatedPosts(relatedPostsData);
          })
          .catch(console.error);

        // 정리 함수 등록
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

      // cleanup 함수 반환
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

  // 댓글 작성
  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!newComment.trim() || !post) return;

    try {
      const postIdNum = parseInt(postId, 10);
      const createdComment = await createComment(postIdNum, newComment);

      setComments((prev) => [...prev, createdComment]);
      setNewComment('');
      showToast('댓글이 등록되었습니다.', 'success');
    } catch (error) {
      console.error('댓글 등록 실패:', error);
      showToast('댓글 등록에 실패했습니다.', 'error');
    }
  };

  // 댓글 좋아요
  const handleCommentLike = (commentId: number) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    toggleCommentLike(commentId);
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

  // 댓글 수정 제출
  const handleSubmitEdit = async (e: FormEvent) => {
    e.preventDefault();

    if (!editingComment) return;

    try {
      const updatedComment = await updateComment(
        editingComment.id,
        editingComment.content
      );

      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === editingComment.id) {
            return {
              ...comment,
              content: updatedComment.content,
              updated_at: updatedComment.updated_at,
            };
          }

          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === editingComment.id
                  ? {
                      ...reply,
                      content: updatedComment.content,
                      updated_at: updatedComment.updated_at,
                    }
                  : reply
              ),
            };
          }

          return comment;
        })
      );

      setEditingComment(null);
      showToast('댓글이 수정되었습니다.', 'success');
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      showToast('댓글 수정에 실패했습니다.', 'error');
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (
    commentId: number,
    isReply: boolean = false,
    parentId?: number
  ) => {
    if (isReply) {
      if (!window.confirm('정말로 이 답글을 삭제하시겠습니까?')) return;
    } else {
      const comment = comments.find((c) => c.id === commentId);
      if (comment?.replies && comment.replies.length > 0) {
        showToast('답글이 있는 댓글은 삭제할 수 없습니다.', 'error');
        return;
      }

      if (!window.confirm('정말로 이 댓글을 삭제하시겠습니까?')) return;
    }

    try {
      const success = await deleteComment(commentId);

      if (success) {
        // TanStack Query 캐시에서 댓글 관련 데이터 정리
        invalidateCommentCache(commentId);

        if (isReply && parentId) {
          setComments((prevComments) =>
            prevComments.map((comment) => {
              if (comment.id === parentId && comment.replies) {
                return {
                  ...comment,
                  replies: comment.replies.filter(
                    (reply) => reply.id !== commentId
                  ),
                };
              }
              return comment;
            })
          );
        } else {
          setComments((prevComments) =>
            prevComments.filter((comment) => comment.id !== commentId)
          );
        }

        showToast('댓글이 삭제되었습니다.', 'success');
      }
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      showToast('댓글 삭제에 실패했습니다.', 'error');
    }
  };

  // 답글 제출
  const handleSubmitReply = async (e: React.FormEvent, commentId: number) => {
    e.preventDefault();

    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!newReply.content.trim() || !post) return;

    try {
      const postIdNum = parseInt(postId, 10);
      const createdReply = await createComment(
        postIdNum,
        newReply.content,
        commentId
      );

      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), createdReply],
            };
          }
          return comment;
        })
      );

      setNewReply({ commentId: null, content: '' });
      showToast('답글이 등록되었습니다.', 'success');
    } catch (error) {
      console.error('답글 등록 실패:', error);
      showToast('답글 등록에 실패했습니다.', 'error');
    }
  };

  // 댓글별 좋아요 상태 가져오기
  const getCommentLikeStatus = (commentId: number) => {
    return commentsLikeStatus?.[commentId] || { isLiked: false, likesCount: 0 };
  };

  // 로딩 상태 최적화 - 스켈레톤 UI 대신 빠른 콘텐츠 표시
  if (isLoading && !post) {
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

        {/* 로딩 스켈레톤 */}
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

  // 현재 사용자가 작성자인지 확인
  const isOwner = user && user.id === post.author_id;

  // 전역 상태에서 좋아요, 북마크 상태 가져오기
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

      {/* 게시글 본문 - 즉시 렌더링 */}
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

      {/* 관련 게시글 - 데이터가 있을 때만 렌더링 */}
      {relatedPosts.length > 0 && <RelatedPosts posts={relatedPosts} />}

      {/* 댓글 섹션 - 백그라운드 로딩 */}
      <CommentsSection
        comments={comments}
        user={user}
        newComment={newComment}
        setNewComment={setNewComment}
        onSubmitComment={handleSubmitComment}
        onCommentLike={handleCommentLike}
        getCommentLikeStatus={getCommentLikeStatus}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
        onSubmitReply={handleSubmitReply}
        editingComment={editingComment}
        setEditingComment={setEditingComment}
        newReply={newReply}
        setNewReply={setNewReply}
        onCancelEdit={handleCancelEdit}
        onSubmitEdit={handleSubmitEdit}
        onLoginRequired={() => setIsLoginModalOpen(true)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
