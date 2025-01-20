import { Lecture } from '@/types/knowledge/lecture';
import { Heart, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const Card = (lecture: Lecture) => {
  return (
    <Link
      href={lecture.href}
      className="flex h-[250px] w-[160px] flex-col border border-black bg-gold-end"
    >
      <div className="relative h-[105px] w-full border border-gray-700">
        <Image
          src={lecture.thumbnailUrl}
          alt={lecture.title}
          width={160}
          height={105}
        ></Image>
        <div className="absolute right-1 top-1 z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-light">
          <Heart className="z-10 h-4 w-4 text-gold-start" />
        </div>
      </div>
      <div className="flex-col">
        <div className="flex h-[60px] flex-col justify-between">
          <div className="flex gap-2">
            <span>{lecture.groupType}</span>
            <div>{lecture.category}</div>
          </div>
          <div>{lecture.title}</div>
          <div>{lecture.instructor}</div>
        </div>

        <div className="flex flex-col">
          <div className="flex gap-1">
            <span>{lecture.depth}</span>
            <span>/</span>
            <span>{lecture.keyword}</span>
          </div>
          <div className="flex">
            <div className="flex">
              <Heart />
              <span className="text-sm">{lecture.likes}</span>
            </div>
            <div className="flex">
              <User />
              <span className="text-sm">{lecture.students}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Card;
