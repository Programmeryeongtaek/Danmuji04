'use client';

import { fetchPopularBooks } from '@/utils/services/book/bookService';
import { Book, ThumbsUp, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface BookItem {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  study_count: number;
  recommendation_count: number;
}

const FeaturedBooks = () => {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBooks = async () => {
      setIsLoading(true);
      try {
        const booksData = await fetchPopularBooks(4); // 4개 가져오기
        setBooks(booksData);
      } catch (error) {
        console.error('인기 도서 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBooks();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="h-6 w-6 text-gold-start" />
          <h2 className="text-2xl font-bold">추천 도서</h2>
        </div>
        <Link
          href="/study?category=book"
          className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
        >
          전체 도서 보기
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-80 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
        </div>
      ) : books.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/study/book/${book.id}`}
              className="group flex flex-col rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex justify-center">
                {book.cover_url ? (
                  <div className="relative h-[160px] w-[120px] overflow-hidden rounded shadow">
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      width={120}
                      height={160}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-[160px] w-[120px] items-center justify-center rounded bg-gray-200 shadow">
                    <Book className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              <h3 className="mb-1 line-clamp-2 text-lg font-semibold group-hover:text-gold-start">
                {book.title}
              </h3>

              <p className="mb-3 text-sm text-gray-600">{book.author}</p>

              <div className="mt-auto flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{book.recommendation_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{book.study_count || 0}개 스터디</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border bg-gray-50 p-6">
          <Book className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">아직 등록된 도서가 없습니다.</p>
        </div>
      )}
    </div>
  );
};

export default FeaturedBooks;
