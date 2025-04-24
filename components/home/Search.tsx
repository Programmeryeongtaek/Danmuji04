'use client';

import { SearchIcon } from 'lucide-react';
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
    <section className="relative bg-gradient-to-r from-amber-50 to-yellow-50 py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-6 h-10 text-center">
            <h2
              className={`text-xl font-medium text-gray-800 transition-all duration-500 md:text-2xl ${
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
              className="w-full rounded-full border border-gray-300 bg-white px-6 py-4 pr-12 shadow-md focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-gold-start p-2 text-white transition-colors hover:bg-gold-end"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-gray-500">추천 검색어:</span>
            {['인문학', '철학', '심리학', '자기계발', '리더십'].map((tag) => (
              <a
                key={tag}
                href={`/knowledge?category=search&q=${encodeURIComponent(tag)}`}
                className="rounded-full bg-white px-3 py-1 text-sm hover:bg-gray-50"
              >
                {tag}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Search;
