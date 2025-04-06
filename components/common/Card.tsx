'use client';

import { Lecture } from '@/types/knowledge/lecture';
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
  const fallbackImageUrl = '/images/danmuji.jpg';

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
      className="flex h-[250px] w-[160px] flex-col border border-black bg-gold-end"
    >
      <div className="relative h-[105px] w-full border border-gray-700">
        <Image
          src={thumbnail_url || fallbackImageUrl}
          alt={title}
          width={160}
          height={105}
          className="h-full w-full object-cover"
        />
        {showBookmark && (
          <button
            onClick={handleBookmarkClick}
            className="absolute right-1 top-1 z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-light"
          >
            <Bookmark
              className={`z-10 h-4 w-4 ${
                isMarked ? 'fill-gold-start text-gold-start' : 'text-gold-start'
              }`}
            />
          </button>
        )}
      </div>
      <div className="flex-col">
        <div className="flex h-[60px] flex-col justify-between">
          <div className="flex gap-2">
            <span>{group_type}</span>
            <div>{category}</div>
          </div>
          <div>{title}</div>
          <div>{instructor}</div>
        </div>

        <div className="flex flex-col">
          <div className="flex gap-1">
            <span>{depth}</span>
            <span>/</span>
            <span>{keyword}</span>
          </div>
          <div className="flex">
            <div className="flex">
              <Heart />
              <span className="text-sm">{likes}</span>
            </div>
            <div className="flex">
              <User />
              <span className="text-sm">{students}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Card;
