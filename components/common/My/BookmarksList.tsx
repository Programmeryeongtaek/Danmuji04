'use client';

import {
  BookmarkedPost,
  fetchBookmarkedPosts,
} from '@/utils/services/communityService';
import { BookmarkIcon, Eye, MessageSquare, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export default function BookmarksList() {
  // API 호출 상태 추적을 위한 플래그 추가
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    data: bookmarks,
    isLoading,
    hasMore,
    observerRef,
    error,
    reset,
  } = useInfiniteScroll<BookmarkedPost>({
    fetchData: async (page) => {
      console.log(`북마크 데이터 요청: 페이지 ${page}`);
      try {
        const result = await fetchBookmarkedPosts(page, 10);
        console.log(`북마크 데이터 응답: ${result.length}개 항목`);
        return result;
      } catch (error) {
        console.error('북마크 데이터 로드 에러:', error);
        throw error;
      }
    },
    pageSize: 10,
    dependencies: [isInitialized], // 의존성 배열에 isInitialized 추가
  });

  // 컴포넌트 마운트 시 한 번만 초기화
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      // reset 기능이 있다면 호출
      if (reset) reset();
    };
  }, []);

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // 오늘
      return date.toLocaleTimeString('ko-kr', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays < 7) {
      // 일주일 이내
      return `${diffDays}일 전`;
    } else {
      // 일주일 이상
      return date.toLocaleDateString('ko-kr', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // 로딩 중 표시
  if (isLoading && bookmarks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-start border-b-transparent"></div>
        <span className="ml-2">북마크를 불러오는 중...</span>
      </div>
    );
  }

  // 데이터 없음 표시
  if (bookmarks.length === 0 && !isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border bg-gray-50 p-8">
        <BookmarkIcon className="mb-2 h-12 w-12 text-gray-300" />
        <h3 className="mb-2 text-lg font-medium text-gray-600">
          북마크가 없습니다
        </h3>
        <p className="text-center text-gray-500">
          관심있는 게시글을 북마크해 보세요!
        </p>
        <Link
          href="/community"
          className="mt-4 rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white"
        >
          커뮤니티 둘러보기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="mb-4 text-xl font-bold">북마크한 게시글</h2>

      {bookmarks.map((post) => (
        <Link
          key={post.id}
          href={`/community/post/${post.id}`}
          className="block rounded-lg border p-4 hover:border-gold-start hover:bg-gray-50"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                {post.category}
              </span>

              {post.tags && post.tags.length > 0 && (
                <div className="hidden flex-wrap gap-1 sm:flex">
                  {post.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-gray-100 px-1.5 text-xs text-gray-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {formatDate(post.created_at)}
            </span>
          </div>

          <h3 className="mb-2 text-lg font-medium">{post.title}</h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
                {post.author_avatar ? (
                  <Image
                    src={
                      post.author_avatar.startsWith('http')
                        ? post.author_avatar
                        : `/${post.author_avatar}`
                    } // 상대 경로에 '/'를 추가
                    alt={post.author_name || ''}
                    width={24}
                    height={24}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                    {post.author_name
                      ? post.author_name.charAt(0).toUpperCase()
                      : '?'}
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-600">{post.author_name}</span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{post.comments_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                <span>{post.likes_count}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}

      {/* 무한 스크롤을 위한 관찰 요소 */}
      {hasMore ? (
        <div ref={observerRef} className="py-4">
          {isLoading && (
            <div className="flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gold-start"></div>
              <span className="ml-2 text-gray-600">더 불러오는 중...</span>
            </div>
          )}
        </div>
      ) : (
        bookmarks.length > 0 && (
          <div className="py-4 text-center text-gray-500">
            모든 북마크를 불러왔습니다.
          </div>
        )
      )}

      {/* 에러 발생 시 표시 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-500">
          북마크를 불러오는데 실패했습니다. 다시 시도해주세요.
        </div>
      )}
    </div>
  );
}
