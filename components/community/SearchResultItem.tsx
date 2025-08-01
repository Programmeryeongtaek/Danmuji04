'use client';

import { Post } from '@/app/types/community/communityType';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  COMMUNITY_CATEGORIES,
  CommunityCategory,
  getCategoryStyle,
} from './Const';

interface SearchResultItemProps {
  post: Post;
  searchQuery: string;
  formatDate: (dateString: string) => string;
  highlightText: (text: string, searchTerm: string) => React.ReactNode;
  extractImages: (content: string) => string[];
  getContentPreview: (content: string, maxLength?: number) => string;
  isAllowedImageHost: (url: string) => boolean;
}

export default function SearchResultItem({
  post,
  searchQuery,
  formatDate,
  highlightText,
  extractImages,
  getContentPreview,
  isAllowedImageHost,
}: SearchResultItemProps) {
  const imageUrls = extractImages(post.content || '');
  const contentPreview = getContentPreview(post.content || '');

  return (
    <div className="group rounded-lg border p-4 hover:border-gold-start hover:bg-light">
      <Link href={`/community/post/${post.id}`}>
        <div className="mb-2 flex items-center justify-between">
          <span
            className={`rounded-full px-2 py-1 text-xs ${getCategoryStyle(post.category as CommunityCategory)}`}
          >
            {COMMUNITY_CATEGORIES.find((c) => c.id === post.category)?.label}
          </span>
          <div className="text-xs text-gray-500 group-hover:text-black">
            {formatDate(post.created_at)}
          </div>
        </div>

        <h2 className="mb-2 text-lg font-medium">
          {highlightText(post.title, searchQuery)}
        </h2>

        {contentPreview && (
          <p className="mb-3 text-gray-600">
            {highlightText(contentPreview, searchQuery)}
          </p>
        )}

        {/* 이미지 미리보기 (최대 3개) */}
        {imageUrls.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {imageUrls.map((url, index) => (
              <div
                key={index}
                className="relative h-24 w-24 overflow-hidden rounded-lg border bg-gray-100"
              >
                <Image
                  src={url}
                  alt={`게시글 이미지 ${index + 1}`}
                  fill
                  unoptimized={true}
                  className="object-cover"
                  sizes="96px"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      '/images/placeholder.png';
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700"
              >
                #{highlightText(tag, searchQuery)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
              {post.author_avatar && isAllowedImageHost(post.author_avatar) ? (
                <Image
                  src={post.author_avatar}
                  alt={post.author_name || ''}
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                />
              ) : post.author_avatar ? (
                <Image
                  src={post.author_avatar}
                  alt={post.author_name || ''}
                  width={24}
                  height={24}
                  unoptimized={true}
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
            <span className="text-sm">{post.author_name}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 group-hover:text-black">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{post.comments_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              <span>{post.likes_count || 0}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
