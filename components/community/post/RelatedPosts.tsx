'use client';

import { Post } from '@/app/types/community/communityType';
import Link from 'next/link';
import { memo, useMemo } from 'react';

interface RelatedPostsProps {
  posts: Post[];
}

const RelatedPosts = memo(({ posts }: RelatedPostsProps) => {
  // 🔥 날짜 포맷팅 함수 메모이제이션
  const formatDate = useMemo(() => {
    return (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="mb-8 rounded-lg border bg-gray-50 p-4">
      <h2 className="mb-4 text-lg font-bold">관련 게시글</h2>
      <div className="space-y-3">
        {posts.map((relatedPost) => (
          <Link
            key={relatedPost.id}
            href={`/community/post/${relatedPost.id}`}
            className="block rounded-lg bg-white p-3 transition-colors hover:bg-gold-start/5"
          >
            <div className="flex items-start justify-between">
              <h3 className="line-clamp-2 font-medium">{relatedPost.title}</h3>
              <span className="ml-2 whitespace-nowrap text-xs text-gray-500">
                {formatDate(relatedPost.created_at)
                  .split(' ')
                  .slice(0, 3)
                  .join(' ')}
              </span>
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-gray-500">
              {relatedPost.content && relatedPost.content.length > 100
                ? relatedPost.content.slice(0, 100) + '...'
                : relatedPost.content || '내용 없음'}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

RelatedPosts.displayName = 'RelatedPosts';

export default RelatedPosts;
