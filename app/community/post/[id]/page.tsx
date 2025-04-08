'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import LoginModal from '@/components/home/LoginModal';
import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import {
  BookmarkPlus,
  ChevronLeft,
  Eye,
  Logs,
  MessageCircle,
  MessageSquare,
  Share2,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

// 커뮤니티 카테고리 정의
const communityCategories = [
  {
    id: 'all',
    label: '전체',
    icon: Logs,
    description: '모든 게시글을 확인하세요',
  },
  {
    id: 'faq',
    label: '질문 게시판',
    icon: MessageCircle,
    description: '궁금한 점을 질문하고 답변을 받아보세요',
  },
  {
    id: 'chats',
    label: '자유게시판',
    icon: MessageCircle,
    description: '다양한 주제로 자유롭게 대화해보세요',
  },
  {
    id: 'study',
    label: '스터디',
    icon: MessageCircle,
    description: '함께 공부하고 성장할 스터디를 찾아보세요',
  },
  {
    id: 'notice',
    label: '공지사항',
    icon: MessageCircle,
    description: '중요한 공지사항을 확인하세요',
  },
];

// 더미 게시글 데이터
const dummyPosts = [
  {
    id: 1,
    title: 'Next.js에서 상태 관리 어떻게 하시나요?',
    content:
      'Next.js 프로젝트에서 상태 관리를 어떻게 하시는지 궁금합니다. Redux, Jotai, Zustand 등 어떤 것이 좋을까요?\n\n저는 최근에 새로운 프로젝트를 시작했는데, 상태 관리 라이브러리를 어떤 것으로 선택해야 할지 고민이 많습니다. 기존에는 Redux를 사용했지만 보일러플레이트 코드가 많아 불편했고, Context API는 성능 이슈가 있다고 들었습니다.\n\n여러분의 경험과 의견을 듣고 싶습니다. 특히 대규모 프로젝트에서의 경험이 궁금합니다. 감사합니다!',
    author: '개발자123',
    authorId: 'user1',
    profileImage: '/images/danmuji.png',
    category: 'faq',
    views: 245,
    comments: 18,
    likes: 32,
    createdAt: '2023-12-15T14:23:00',
    tags: ['Next.js', 'React', '상태관리'],
  },
  {
    id: 2,
    title: '주말에 같이 코딩할 스터디원 모집합니다',
    content:
      '주말마다 모여서 함께 코딩하고 피드백을 나눌 스터디원을 모집합니다. 장소는 강남역 근처입니다.',
    author: '스터디장',
    authorId: 'user2',
    profileImage: null,
    category: 'study',
    views: 189,
    comments: 24,
    likes: 15,
    createdAt: '2023-12-14T09:45:00',
    tags: ['스터디', '모집', '코딩'],
  },
  {
    id: 3,
    title: '새로운 강의 오픈 안내',
    content:
      '12월 20일부터 "Next.js 마스터 클래스" 강의가 오픈됩니다. 많은 관심 부탁드립니다.',
    author: '관리자',
    authorId: 'admin',
    profileImage: '/images/danmuji.png',
    category: 'notice',
    views: 421,
    comments: 5,
    likes: 76,
    createdAt: '2023-12-13T16:30:00',
    tags: ['공지', '강의', 'Next.js'],
  },
  {
    id: 4,
    title: '요즘 읽고 있는 개발 서적 추천해주세요',
    content:
      '요즘 읽기 좋은 개발 관련 서적 추천 부탁드립니다. 주로 백엔드 개발을 하고 있습니다.',
    author: '책벌레',
    authorId: 'user3',
    profileImage: null,
    category: 'chats',
    views: 156,
    comments: 42,
    likes: 23,
    createdAt: '2023-12-11T10:15:00',
    tags: ['책', '추천', '백엔드'],
  },
  {
    id: 5,
    title: 'TypeScript 타입 추론 관련 질문입니다',
    content:
      'TypeScript에서 제네릭 타입 추론이 잘 안되는 경우가 있는데, 어떻게 해결하시나요?',
    author: '타입충',
    authorId: 'user4',
    profileImage: '/images/danmuji.png',
    category: 'faq',
    views: 203,
    comments: 15,
    likes: 28,
    createdAt: '2023-12-10T19:20:00',
    tags: ['TypeScript', '타입추론', '제네릭'],
  },
  {
    id: 6,
    title: '사이트 점검 안내',
    content:
      '12월 25일 오전 2시부터 4시까지 서버 점검이 있을 예정입니다. 이용에 참고 부탁드립니다.',
    author: '관리자',
    authorId: 'admin',
    profileImage: '/images/danmuji.png',
    category: 'notice',
    views: 310,
    comments: 2,
    likes: 45,
    createdAt: '2023-12-09T13:50:00',
    tags: ['공지', '점검'],
  },
];

// 댓글 타입 정의
interface Comment {
  id: number;
  postId: number;
  author: string;
  authorId: string;
  profileImage: string | null;
  content: string;
  likes: number;
  isLiked?: boolean;
  createdAt: string;
  replies?: Comment[];
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const [post, setPost] = useState<any>(null);
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
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);

  useEffect(() => {
    // 게시글 데이터 불러오기 (실제로는 API 호출)
    const fetchPost = () => {
      setIsLoading(true);

      // ID로 게시글 찾기
      const foundPost = dummyPosts.find((p) => p.id === parseInt(postId));

      if (foundPost) {
        setPost(foundPost);
        setLikesCount(foundPost.likes);

        // 댓글 불러오기
        const dummyComments: Comment[] = [
          {
            id: 1,
            postId: foundPost.id,
            author: '코드마스터',
            authorId: 'user7',
            profileImage: '/images/danmuji.png',
            content: '저는 Zustand를 선호합니다. 간단하고 직관적이에요.',
            likes: 12,
            isLiked: false,
            createdAt: '2023-12-15T15:30:00',
            replies: [
              {
                id: 3,
                postId: foundPost.id,
                author: '개발자123',
                authorId: 'user1',
                profileImage: '/images/danmuji.png',
                content: '감사합니다! Zustand 한번 살펴볼게요.',
                likes: 3,
                isLiked: false,
                createdAt: '2023-12-15T16:15:00',
              },
            ],
          },
          {
            id: 2,
            postId: foundPost.id,
            author: '리액트팬',
            authorId: 'user8',
            profileImage: null,
            content:
              'Redux는 러닝커브가 있지만 큰 프로젝트에서는 확실히 장점이 있어요.',
            likes: 8,
            isLiked: false,
            createdAt: '2023-12-15T15:45:00',
          },
        ];

        setComments(dummyComments);

        // 관련 게시글 찾기 (같은 태그를 공유하는 게시글)
        if (foundPost.tags && foundPost.tags.length > 0) {
          const related = dummyPosts
            .filter(
              (p) =>
                p.id !== foundPost.id &&
                p.tags.some((tag) => foundPost.tags.includes(tag))
            )
            .slice(0, 3);
          setRelatedPosts(related);
        }
      } else {
        // 게시글 없음
        router.push('/community?error=post-not-found');
      }

      setIsLoading(false);
    };

    if (postId) {
      fetchPost();
    }
  }, [postId, router]);

  // 좋아요 처리
  const handleLike = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    setIsLiked(!isLiked);
    setLikesCount((prevCount) => (isLiked ? prevCount - 1 : prevCount + 1));
    showToast(
      isLiked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.',
      'success'
    );
  };

  // 북마크 처리
  const handleBookmark = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    setIsBookmarked(!isBookmarked);
    showToast(
      isBookmarked ? '북마크가 취소되었습니다.' : '북마크에 추가되었습니다.',
      'success'
    );
  };

  // 댓글 작성 처리
  const handleSubmitComment = (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!newComment.trim()) return;

    // 새 댓글 추가 (실제로는 API 호출)
    const newCommentObj: Comment = {
      id: Math.max(0, ...comments.map((c) => c.id)) + 1,
      postId: parseInt(postId),
      author: user.email?.split('@')[0] || '익명',
      authorId: user.id,
      profileImage: null,
      content: newComment,
      likes: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
    };

    setComments([...comments, newCommentObj]);
    setNewComment('');
    showToast('댓글이 등록되었습니다.', 'success');
  };

  // 댓글 좋아요 처리
  const handleCommentLike = (commentId: number) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    setComments((prevComments) =>
      prevComments.map((comment) => {
        if (comment.id === commentId) {
          const isLiked = comment.isLiked || false;
          return {
            ...comment,
            likes: isLiked ? comment.likes - 1 : comment.likes + 1,
            isLiked: !isLiked,
          };
        }
        // 답글에 있는 경우도 확인
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map((reply) => {
              if (reply.id === commentId) {
                const isLiked = reply.isLiked || false;
                return {
                  ...reply,
                  likes: isLiked ? reply.likes - 1 : reply.likes + 1,
                  isLiked: !isLiked,
                };
              }
              return reply;
            }),
          };
        }
        return comment;
      })
    );
  };

  // 답글 작성 모드 설정
  const setReplyMode = (commentId: number | null) => {
    setNewReply({
      commentId,
      content: '',
    });
  };

  // 답글 제출
  const handleSubmitReply = (e: React.FormEvent, commentId: number) => {
    e.preventDefault();

    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!newReply.content.trim()) return;

    // 새 답글 추가
    const newReplyObj: Comment = {
      id: (Math.random() * 1000) | 0, // 임시 ID 생성
      postId: parseInt(postId),
      author: user.email?.split('@')[0] || '익명',
      authorId: user.id,
      profileImage: null,
      content: newReply.content,
      likes: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
    };

    setComments((prevComments) =>
      prevComments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReplyObj],
          };
        }
        return comment;
      })
    );

    setReplyMode(null);
    showToast('답글이 등록되었습니다.', 'success');
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
        <div className="animate-pulse">로딩 중...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold">게시글을 찾을 수 없습니다</h1>
        <Link href="/community" className="text-blue-500 hover:underline">
          커뮤니티로 돌아가기
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
          <ChevronLeft className="mr-1 h-5 w-5" />
          <span>커뮤니티로 돌아가기</span>
        </Link>
      </div>

      {/* 게시글 헤더 */}
      <div className="mb-8">
        {/* 카테고리 및 제목 */}
        <div className="mb-4">
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              post.category === 'notice'
                ? 'bg-red-100 text-red-800'
                : post.category === 'faq'
                  ? 'bg-blue-100 text-blue-800'
                  : post.category === 'study'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            {communityCategories.find((c) => c.id === post.category)?.label}
          </span>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{post.title}</h1>
        </div>

        {/* 작성자 정보 및 게시 정보 */}
        <div className="mb-6 flex flex-wrap items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
              {post.profileImage ? (
                <img
                  src={post.profileImage}
                  alt={post.author}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  {post.author.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium">{post.author}</div>
              <div className="text-sm text-gray-500">
                {formatDate(post.createdAt)}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 sm:mt-0">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{post.views}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{comments.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              <span>{likesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 게시글 본문 */}
      <div className="mb-8 whitespace-pre-line text-gray-800">
        {post.content}
      </div>

      {/* 태그 */}
      {post.tags && post.tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {post.tags.map((tag: string, idx: number) => (
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

      {/* 액션 버튼 */}
      <div className="mb-8 flex justify-center gap-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 rounded-full px-6 py-2 ${
            isLiked
              ? 'bg-gold-start text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ThumbsUp className="h-5 w-5" />
          <span>{isLiked ? '좋아요 취소' : '좋아요'}</span>
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm">
            {likesCount}
          </span>
        </button>

        <button
          onClick={handleBookmark}
          className={`flex items-center gap-2 rounded-full px-6 py-2 ${
            isBookmarked
              ? 'bg-blue-500 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BookmarkPlus className="h-5 w-5" />
          <span>{isBookmarked ? '북마크됨' : '북마크'}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50"
        >
          <Share2 className="h-5 w-5" />
          <span>공유하기</span>
        </button>
      </div>

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
                    {formatDate(relatedPost.createdAt)
                      .split(' ')
                      .slice(0, 3)
                      .join(' ')}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {relatedPost.content.length > 100
                    ? relatedPost.content.slice(0, 100) + '...'
                    : relatedPost.content}
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
            placeholder="댓글을 작성해주세요"
            className="mb-2 h-24 w-full resize-none rounded-lg border p-3 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
          />
          <div className="flex justify-end">
            <Button type="submit" className="px-4 py-2">
              댓글 작성
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
                      {comment.profileImage ? (
                        <img
                          src={comment.profileImage}
                          alt={comment.author}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-500">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{comment.author}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(comment.createdAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCommentLike(comment.id)}
                    className={`flex items-center gap-1 text-sm ${
                      comment.isLiked
                        ? 'text-gold-start'
                        : 'text-gray-500 hover:text-gold-start'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span>{comment.likes}</span>
                  </button>
                </div>

                {/* 댓글 내용 */}
                <div className="whitespace-pre-line pl-10 text-gray-800">
                  {comment.content}
                </div>

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
                      답글 달기
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
                      placeholder="답글을 작성해주세요"
                      className="mb-2 h-20 w-full resize-none rounded-lg border p-3 text-sm focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" className="px-3 py-1 text-sm">
                        답글 등록
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
                              {reply.profileImage ? (
                                <img
                                  src={reply.profileImage}
                                  alt={reply.author}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-500">
                                  {reply.author.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {reply.author}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(reply.createdAt)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCommentLike(reply.id)}
                            className={`flex items-center gap-1 text-sm ${
                              reply.isLiked
                                ? 'text-gold-start'
                                : 'text-gray-500 hover:text-gold-start'
                            }`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span>{reply.likes}</span>
                          </button>
                        </div>

                        {/* 답글 내용 */}
                        <div className="whitespace-pre-line pl-8 text-sm text-gray-800">
                          {reply.content}
                        </div>
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
