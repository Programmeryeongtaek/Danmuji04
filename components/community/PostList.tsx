'use client';

import { Post } from '@/app/types/community/communityType';
import { Eye, MessageSquare, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  COMMUNITY_CATEGORIES,
  CommunityCategory,
  getCategoryStyle,
} from './Const';
import { usePostViewCounts } from '@/hooks/api/usePostView';

interface PostListProps {
  posts: Post[];
  isLoading: boolean;
  onTagClick: (tag: string) => void;
}

export default function PostList({
  posts,
  isLoading,
  onTagClick,
}: PostListProps) {
  const postIds = posts.map((post) => post.id);
  const { data: viewCounts } = usePostViewCounts(postIds);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-Kr', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('ko-Kr', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="rounded-lg border">
      {/* 헤더 */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b bg-gray-50 p-4 font-medium text-gray-700">
        <div className="min-w-[80px] text-center">카테고리</div>
        <div>제목</div>
        <div className="min-w-[80px] text-center mobile:hidden tablet:block">
          작성자
        </div>
        <div className="min-w-[80px] text-center mobile:hidden tablet:block">
          조회수
        </div>
        <div className="min-w-[120px] text-center mobile:hidden tablet:block">
          작성일
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gold-start border-b-transparent"></div>
          <p className="mt-2 text-gray-600">게시글을 불러오는 중...</p>
        </div>
      ) : posts.length > 0 ? (
        posts.map((post) => (
          <div
            key={post.id}
            className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b p-4 hover:bg-light"
          >
            <div className="min-w-[80px] text-center">
              <span
                className={`rounded-full px-2 py-1 text-xs ${getCategoryStyle(post.category as CommunityCategory)}`}
              >
                {
                  COMMUNITY_CATEGORIES.find((c) => c.id === post.category)
                    ?.label
                }
              </span>
            </div>
            <div className="font-medium mobile:flex-1 tablet:flex-none">
              <Link
                href={`/community/post/${post.id}`}
                className="group flex items-start gap-2"
              >
                <span>{post.title}</span>

                {/* 태그 목록 (모바일에서는 숨김) */}
                <div className="hidden sm:flex sm:flex-wrap sm:gap-1">
                  {post.tags &&
                    post.tags.length > 0 &&
                    post.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-gray-100 px-1.5 text-xs text-gray-600 group-hover:text-black"
                        onClick={(e) => {
                          e.preventDefault();
                          onTagClick(tag);
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                </div>

                {post.comments_count && post.comments_count > 0 ? (
                  <span className="ml-1 rounded bg-gold-start/10 px-1.5 text-sm font-normal text-gold-start">
                    {post.comments_count}
                  </span>
                ) : null}
              </Link>

              {/* 게시글 부가 정보 (모바일에서 표시) */}
              <div className="mt-1 flex items-center gap-3 sm:hidden">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Eye className="h-3 w-3" />
                  <span>{viewCounts?.[post.id] ?? post.views ?? 0}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MessageSquare className="h-3 w-3" />
                  <span>{post.comments_count || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <ThumbsUp className="h-3 w-3" />
                  <span>{post.likes_count || 0}</span>
                </div>
              </div>
            </div>
            <div className="min-w-[80px] text-center text-sm text-gray-600 mobile:hidden tablet:block">
              <div className="flex items-center justify-end gap-1">
                <div className="relative h-5 w-5 overflow-hidden rounded-full bg-gray-200">
                  {post.author_avatar ? (
                    <Image
                      src={post.author_avatar}
                      alt={post.author_name || ''}
                      width={40}
                      height={40}
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
                <span>{post.author_name}</span>
              </div>
            </div>
            <div className="min-w-[80px] text-center text-sm text-gray-600 mobile:hidden tablet:block">
              {viewCounts?.[post.id] ?? post.views ?? 0}
            </div>
            <div className="min-w-[120px] text-center text-sm text-gray-600 mobile:hidden tablet:block">
              {formatDate(post.created_at)}
            </div>
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-gray-500">게시글이 없습니다</div>
      )}
    </div>
  );
}
