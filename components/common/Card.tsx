import { Heart, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const Card = () => {
  return (
    // TODO: 링크 삽입
    <Link
      href="/"
      className="flex h-[250px] w-[160px] flex-col border border-black bg-gold-end"
    >
      <div className="relative h-[105px] w-full border border-gray-700">
        <Image src={``} alt="강의명"></Image>
        <div className="absolute right-1 top-1 z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-light">
          <Heart className="z-10 h-4 w-4 text-gold-start" />
        </div>
      </div>
      <div className="flex-col">
        <div className="flex h-[60px] flex-col justify-between">
          <div>강의명</div>
          <div>강사명(닉네임)</div>
        </div>

        <div className="flex flex-col">
          <div className="flex gap-1">
            <span>난이도</span>
            <span>/</span>
            <span>키워드</span>
          </div>
          <div className="flex">
            <div className="flex">
              <Heart />
              <span className="text-sm">좋아요</span>
            </div>
            <div className="flex">
              <User />
              <span className="text-sm">수강자</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Card;
