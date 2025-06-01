'use client';

import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

const phrases = [
  '무지(無知)를 끊다.',
  '지식의 체계화',
  '인생의 마중물',
  '성장을 넘어 성숙으로',
];

const Search = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % phrases.length);
        setIsAnimating(false);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      window.location.href = `/knowledge?category=search&q=${encodeURIComponent(searchTerm.trim())}`;
    }
  };

  return (
    <section className="bg-gradient-to-r from-amber-50 to-yellow-50 py-16 mobile:-m-5 mobile:h-[250px] tablet:m-0 tablet:h-[300px]">
      <div className="mx-auto px-4 mobile:w-[300px] sm:w-[500px] tablet:w-[640px]">
        <div className="flex flex-col items-center justify-center">
          <div className="h-10 text-center mobile:mb-2 tablet:mb-4 laptop:mb-6">
            <h2
              className={`font-bold text-gray-800 transition-all duration-500 mobile:text-xl tablet:text-2xl ${
                isAnimating
                  ? '-translate-y-5 transform opacity-0'
                  : 'transform opacity-100'
              }`}
            >
              {phrases[currentIndex]}
            </h2>
          </div>

          <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="공부하고 싶은 키워드를 입력해보세요."
              className="w-full rounded-full border border-gray-300 bg-white pr-12 shadow-md focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20 mobile:px-4 mobile:py-2 mobile:text-sm tablet:px-6 tablet:py-4 tablet:text-lg"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-gold-start p-2 text-white transition-colors hover:bg-gold-end mobile:hidden sm:block"
            >
              <SearchIcon className="mobile:h-3 mobile:w-3 tablet:h-5 tablet:w-5" />
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 mobile:mt-3 tablet:mt-6">
            <span className="text-sm text-black">추천 검색어:</span>
            {['인문학', '철학', '심리학', '자기계발', '리더십'].map((tag) => (
              <Link
                key={tag}
                href={`/knowledge?category=search&q=${encodeURIComponent(tag)}`}
                className="rounded-full bg-white px-3 py-1 text-sm hover:bg-gray-50"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Search;
