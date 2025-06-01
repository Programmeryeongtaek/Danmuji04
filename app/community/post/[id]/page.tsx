'use client';

import { Comment, Post } from '@/app/types/community/communityType';
import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import LoginModal from '@/components/home/LoginModal';
import { userAtom } from '@/store/auth';
import {
  createComment,
  deleteComment,
  fetchCommentsByPostId,
  toggleCommentLike,
  updateComment,
} from '@/utils/services/community/commentService';
import {
  deletePost,
  fetchPostById,
  fetchRelatedPosts,
  isPostBookmarked,
  togglePostBookmarks,
  togglePostLike,
} from '@/utils/services/community/postService';
import { useAtomValue } from 'jotai';
import {
  BookmarkPlus,
  ChevronLeft,
  Edit,
  Share2,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newReply, setNewReply] = useState<{
    commentId: number | null;
    content: string;
  }>({ commentId: null, content: '' });
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // 수정 모드 상태 추가
  const [editingComment, setEditingComment] = useState<{
    id: number;
    content: string;
    isReply: boolean;
  } | null>(null);

  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchPostData = async () => {
      try {
        setIsLoading(true);

        // 게시글 상세 정보 조회
        const numericPostId = parseInt(postId, 10);
        if (isNaN(numericPostId)) {
          router.push('/community?error-post-not-found');
          return;
        }

        // 게시글 조회
        const postData = await fetchPostById(numericPostId);
        if (!postData) {
          router.push('/community?error=post-not-fount');
          return;
        }

        setPost(postData);
        setIsLiked(postData.is_liked || false);
        setLikesCount(postData.likes_count || 0);

        // 댓글 조회
        const commentsData = await fetchCommentsByPostId(numericPostId);
        setComments(commentsData);

        // 관련 게시글 조회
        const relatedPostsData = await fetchRelatedPosts(numericPostId);
        setRelatedPosts(relatedPostsData);

        // 북마크 상태 조회
        if (user) {
          const bookmarked = await isPostBookmarked(numericPostId);
          setIsBookmarked(bookmarked);
        }
      } catch (error) {
        console.error('게시글 데이터 로드 실패:', error);
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
        router.push('/community');
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      fetchPostData();
    }
  }, [postId, router, showToast, user]);

  const renderPostContent = (content: string | undefined) => {
    // 내용이 없으면 빈 문자열 반환
    if (!content) return '';

    const imageLinkRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts = content.split(imageLinkRegex);

    // 이미지가 없으면 일반 텍스트로 반환
    if (parts.length === 1) {
      return content;
    }

    const result = [];
    let index = 0;

    // 텍스트와 이미지 번갈아가며 렌더링
    for (let i = 0; i < parts.length; i++) {
      if (i % 3 === 0) {
        // 일반 텍스트 부분
        if (parts[i]) {
          result.push(<span key={`text-${index}`}>{parts[i]}</span>);
          index++;
        }
      } else if (i % 3 === 2) {
        // 이미지 URL 부분
        const alt = parts[i - 1] || '이미지';
        const src = parts[i];

        result.push(
          <div key={`img-${index}`} className="my-4">
            <img
              src={src}
              alt={alt}
              className="max-w-full rounded-lg"
              onError={(e) => {
                console.error(`이미지 로드 실패: ${src}`);
                e.currentTarget.src = '/images/placeholder.png'; // 대체 이미지
                e.currentTarget.alt = '이미지를 불러올 수 없습니다';
              }}
            />
          </div>
        );
        index++;
      }
    }

    return result;
  };

  // 좋아요 처리
  const handleLike = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!post) return;

    try {
      const newLikedState = await togglePostLike(post.id, user.id);
      setIsLiked(newLikedState);
      setLikesCount((prev) => (newLikedState ? prev + 1 : prev - 1));
      showToast(
        newLikedState ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.',
        'success'
      );
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      showToast('좋아요 처리에 실패했습니다.', 'error');
    }
  };

  // 북마크 처리
  const handleBookmark = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!post) return;

    try {
      const newBookmarkedState = await togglePostBookmarks(post.id);
      setIsBookmarked(newBookmarkedState);
      showToast(
        newBookmarkedState
          ? '북마크에 추가되었습니다.'
          : '북마크가 취소되었습니다.',
        'success'
      );
    } catch (error) {
      console.error('북마크 처리 실패:', error);
      showToast('북마크 처리에 실패했습니다.', 'error');
    }
  };

  // 댓글 작성 처리
  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!newComment.trim() || !post) return;

    try {
      // 새 댓글 추가
      const postIdNum = parseInt(postId, 10);
      const createdComment = await createComment(postIdNum, newComment);

      // 상태 업데이트
      setComments((prev) => [...prev, createdComment]);
      setNewComment(''); // 입력 필드 초기화
      showToast('댓글이 등록되었습니다.', 'success');
    } catch (error) {
      console.error('댓글 등록 실패:', error);
      showToast('댓글 등록에 실패했습니다.', 'error');
    }
  };

  // 댓글 좋아요 처리
  const handleCommentLike = async (commentId: number) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const isLiked = await toggleCommentLike(commentId, user.id);

      // 댓글 상태 업데이트
      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likes_count: isLiked
                ? (comment.likes_count || 0) + 1
                : (comment.likes_count || 0) - 1,
              is_liked: isLiked,
            };
          }
          // 대댓글 확인
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) => {
                if (reply.id === commentId) {
                  return {
                    ...reply,
                    likes_count: isLiked
                      ? (reply.likes_count || 0) + 1
                      : (reply.likes_count || 0) - 1,
                    is_liked: isLiked,
                  };
                }
                return reply;
              }),
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('댓글 좋아요 실패:', error);
      showToast('좋아요 처리에 실패했습니다.', 'error');
    }
  };

  // 답글 작성 모드 설정
  const setReplyMode = (commentId: number | null) => {
    setNewReply({
      commentId,
      content: '',
    });
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
      // 답글 생성
      const postIdNum = parseInt(postId, 10);
      const createdReply = await createComment(
        postIdNum,
        newReply.content,
        commentId
      );

      // 댓글 상태 업데이트
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

      // 폼 초기화
      setReplyMode(null);
      showToast('답글이 등록되었습니다.', 'success');
    } catch (error) {
      console.error('답글 등록 실패:', error);
      showToast('답글 등록에 실패했습니다.', 'error');
    }
  };

  // 댓글 수정 시작 핸들러
  const handleEditComment = (comment: Comment, isReply: boolean = false) => {
    setEditingComment({
      id: comment.id,
      content: comment.content,
      isReply,
    });
  };

  // 댓글 수정 취소 핸들러
  const handleCancelEdit = () => {
    setEditingComment(null);
  };

  // 댓글 수정 제출 핸들러
  const handleSubmitEdit = async (e: FormEvent) => {
    e.preventDefault();

    if (!editingComment) return;

    try {
      // updateComment 함수 호출하여 댓글 업데이트
      const updatedComment = await updateComment(
        editingComment.id,
        editingComment.content
      );

      // 받아온 updatedComment를 사용하여 상태 업데이트
      setComments((prevComments) =>
        prevComments.map((comment) => {
          // 수정 중인 댓글이 일반 댓글인 경우
          if (comment.id === editingComment.id) {
            return {
              ...comment,
              content: updatedComment.content,
              updated_at: updatedComment.updated_at,
            };
          }

          // 수정 중인 댓글이 답글인 경우
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

  // 댓글 삭제 핸들러
  const handleDeleteComment = async (
    commentId: number,
    isReply: boolean = false,
    parentId?: number
  ) => {
    // 답글인 경우 바로 삭제 진행
    if (isReply) {
      if (!window.confirm('정말로 이 답글을 삭제하시겠습니까?')) return;
    } else {
      // 댓글인 경우, 답글이 있는지 확인
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
        if (isReply && parentId) {
          // 답글 삭제
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
          // 일반 댓글 삭제
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

  // 공유하기 기능
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

  // 게시글 수정 함수
  const handleEditPost = () => {
    if (!post) return;
    router.push(`/community/post/${post.id}/edit`);
  };

  // 게시글 삭제 처리
  const handleDeletePost = async () => {
    if (!post) return;
    if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    try {
      setIsLoading(true);

      // 게시글 삭제 API 호출
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

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gold-start border-b-transparent"></div>
        <p className="ml-2">로딩 중...</p>
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

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <Link
          href="/community"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-6 w-6" />
        </Link>
      </div>

      {/* 게시글 헤더 */}
      <div className="mb-8">
        <h1 className="mb-4 text-2xl font-bold sm:text-3xl">{post.title}</h1>

        {/* 작성자 정보 및 게시 정보 */}
        <div className="mb-6 flex flex-wrap items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
              {post.author_avatar ? (
                <Image
                  src={post.author_avatar}
                  alt={post.author_name || ''}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  {post.author_name
                    ? post.author_name.charAt(0).toUpperCase()
                    : '?'}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium">{post.author_name}</div>
              <div className="text-sm text-gray-500">
                {formatDate(post.created_at)}
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleShare}
              className="text-gray-700 hover:text-gold-start"
            >
              <Share2 className="h-5 w-5" />
            </button>

            <button
              onClick={handleBookmark}
              className={`${
                isBookmarked
                  ? 'text-gold-start'
                  : 'text-gray-700 hover:text-gold-start'
              }`}
            >
              <BookmarkPlus className="h-5 w-5" />
            </button>

            <button
              onClick={handleLike}
              className={`flex gap-1 ${
                isLiked
                  ? 'text-gold-start'
                  : 'text-gray-700 hover:text-gold-start'
              }`}
            >
              <ThumbsUp className="h-5 w-5" />
              <span className="ml-1 text-sm text-black">{likesCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 게시글 본문 */}
      <div className="relative mb-8 whitespace-pre-line text-gray-800">
        {user && user.id === post.author_id && (
          <div className="absolute -top-5 right-0 flex gap-2">
            <button
              onClick={handleEditPost}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              수정
            </button>
            <button
              onClick={handleDeletePost}
              className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        )}
        {renderPostContent(post.content)}
      </div>

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
      {relatedPosts.length > 0 && (
        <div className="mb-8 rounded-lg border bg-gray-50 p-4">
          <h2 className="mb-4 text-lg font-bold">관련 게시글</h2>
          <div className="space-y-3">
            {relatedPosts.map((relatedPost) => (
              <Link
                key={relatedPost.id}
                href={`/community/post/${relatedPost.id}`}
                className="block rounded-lg bg-white p-3 hover:bg-gold-start/5"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">{relatedPost.title}</h3>
                  <span className="text-xs text-gray-500">
                    {formatDate(relatedPost.created_at)
                      .split(' ')
                      .slice(0, 3)
                      .join(' ')}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {relatedPost.content && relatedPost.content.length > 100
                    ? relatedPost.content.slice(0, 100) + '...'
                    : relatedPost.content || '내용 없음'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 댓글 섹션 */}
      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold">댓글 {comments.length}개</h2>

        {/* 댓글 입력 */}
        <form onSubmit={handleSubmitComment} className="mb-6">
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
              <div key={comment.id} className="rounded-lg border p-4">
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
                      <div className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCommentLike(comment.id)}
                      className={`flex items-center gap-1 text-sm ${
                        comment.is_liked
                          ? 'text-gold-start'
                          : 'text-gray-500 hover:text-gold-start'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>{comment.likes_count || 0}</span>
                    </button>

                    {/* 수정/삭제 버튼 추가 - 작성자일 경우만 표시 */}
                    {user && user.id === comment.author_id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditComment(comment)}
                          className="text-sm text-gray-500 hover:text-blue-500"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-sm text-gray-500 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 댓글 내용 - 수정 모드인 경우 수정 폼 표시 */}
                {editingComment && editingComment.id === comment.id ? (
                  <form onSubmit={handleSubmitEdit} className="pl-10">
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
                        onClick={handleCancelEdit}
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
                        title={`수정 시간: ${formatDate(comment.updated_at)}`}
                      >
                        (수정됨)
                      </span>
                    )}
                  </div>
                )}

                {/* 답글 버튼 */}
                <div className="mt-2 flex justify-end">
                  {newReply.commentId === comment.id ? (
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
                {newReply.commentId === comment.id && (
                  <form
                    onSubmit={(e) => handleSubmitReply(e, comment.id)}
                    className="mt-3 pl-10"
                  >
                    <textarea
                      value={newReply.content}
                      onChange={(e) =>
                        setNewReply({ ...newReply, content: e.target.value })
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
                      <div
                        key={reply.id}
                        className="border-t border-gray-200 pt-4 first:border-0 first:pt-0"
                      >
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
                              <div className="text-sm font-medium">
                                {reply.author_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(reply.created_at)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCommentLike(reply.id)}
                              className={`flex items-center gap-1 text-sm ${
                                reply.is_liked
                                  ? 'text-gold-start'
                                  : 'text-gray-500 hover:text-gold-start'
                              }`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                              <span>{reply.likes_count || 0}</span>
                            </button>

                            {/* 수정/삭제 버튼 추가 - 작성자일 경우만 표시 */}
                            {user && user.id === reply.author_id && (
                              <div className="flex items-center gap-2 text-xs">
                                <button
                                  onClick={() => handleEditComment(reply, true)}
                                  className="text-gray-500 hover:text-blue-500"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() =>
                                    handleDeleteComment(
                                      reply.id,
                                      true,
                                      comment.id
                                    )
                                  }
                                  className="text-gray-500 hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 답글 내용 - 수정 모드인 경우 수정 폼 표시 */}
                        {editingComment && editingComment.id === reply.id ? (
                          <form onSubmit={handleSubmitEdit} className="pl-8">
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
                                onClick={handleCancelEdit}
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
                                title={`수정 시간: ${formatDate(reply.updated_at)}`}
                              >
                                (수정됨)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-500">
              아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
            </div>
          )}
        </div>
      </div>

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
