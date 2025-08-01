'use client';

import { Post } from '@/app/types/community/communityType';
import { BookmarkPlus, Share2, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import { memo, useMemo } from 'react';

interface PostHeaderProps {
  post: Post;
  likeStatus: { isLiked: boolean; likesCount: number };
  bookmarkStatus: boolean;
  onLike: () => void;
  onBookmark: () => void;
  onShare: () => void;
}

const PostHeader = memo(
  ({
    post,
    likeStatus,
    bookmarkStatus,
    onLike,
    onBookmark,
    onShare,
  }: PostHeaderProps) => {
    // 날짜 포맷팅 메모이제이션
    const formattedDate = useMemo(() => {
      const date = new Date(post.created_at);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [post.created_at]);

    return (
      <div className="mobile:mb-4 tablet:mb-6 laptop:mb-8">
        <h1 className="mb-4 font-bold mobile:text-2xl tablet:text-3xl">
          {post.title}
        </h1>

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
                  priority // 작은 아바타는 우선 로딩
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
              <div className="text-sm text-gray-500">{formattedDate}</div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-center gap-4">
            <button
              onClick={onShare}
              className="text-gray-700 hover:text-gold-start"
              aria-label="공유하기"
            >
              <Share2 className="h-5 w-5" />
            </button>

            <button
              onClick={onBookmark}
              className={`${
                bookmarkStatus
                  ? 'text-gold-start'
                  : 'text-gray-700 hover:text-gold-start'
              }`}
              aria-label="북마크"
            >
              <BookmarkPlus className="h-5 w-5" />
            </button>

            <button
              onClick={onLike}
              className={`flex gap-1 ${
                likeStatus.isLiked
                  ? 'text-gold-start'
                  : 'text-gray-700 hover:text-gold-start'
              }`}
              aria-label="좋아요"
            >
              <ThumbsUp className="h-5 w-5" />
              <span className="ml-1 text-sm text-black">
                {likeStatus.likesCount}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

PostHeader.displayName = 'PostHeader';

export default PostHeader;
