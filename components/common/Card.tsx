'use client';

import { Lecture } from '@/app/types/knowledge/lecture';
import { Bookmark, Heart, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { MouseEvent, useState } from 'react';

interface CardProps extends Lecture {
  isBookmarked?: boolean;
  onToggleBookmark?: (lectureId: number) => void;
  showBookmark?: boolean;
  isMyLecture?: boolean;
}

const Card = ({
  id,
  title,
  thumbnail_url,
  category,
  instructor,
  depth,
  keyword,
  group_type,
  likes,
  students,
  isBookmarked = false,
  onToggleBookmark,
  showBookmark = true,
  isMyLecture = false,
}: CardProps) => {
  const [isMarked, setIsMarked] = useState(isBookmarked);
  const fallbackImageUrl = '/images/danmuji.png';

  const handleBookmarkClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // 링크 이벤트 전파 방지
    e.stopPropagation(); // 이벤트 버블링 방지
    setIsMarked(!isMarked);
    if (onToggleBookmark) {
      onToggleBookmark(id);
    }
  };

  return (
    <Link
      href={
        isMyLecture ? `/my/lectures/${id}/manage` : `/knowledge/lecture/${id}`
      }
      className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-200">
        <Image
          src={thumbnail_url || fallbackImageUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          className="h-full w-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = fallbackImageUrl;
          }}
        />
        {showBookmark && (
          <button
            onClick={handleBookmarkClick}
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm transition-colors hover:bg-white"
            aria-label={isMarked ? '북마크 취소' : '북마크 추가'}
          >
            <Bookmark
              className={`h-5 w-5 ${
                isMarked ? 'fill-gold-start text-gold-start' : 'text-gray-700'
              }`}
            />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="mb-1 line-clamp-2 flex-1 text-sm font-medium text-gray-800">
          {title}
        </h3>

        <p className="mb-2 text-xs text-gray-700">{instructor}</p>

        <div className="mb-2 flex items-center gap-2 text-xs text-gray-600">
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {group_type}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {category}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">{depth}</span>
        </div>

        <div className="truncate text-xs">{keyword}</div>

        <div className="mt-auto flex items-center justify-between text-xs text-gray-600">
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{students}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Card;
