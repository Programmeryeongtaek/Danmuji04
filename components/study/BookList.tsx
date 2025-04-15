'use client';

import { useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { Book, Search, Star, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface BookProps {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  description?: string;
  rating: number;
  recommendation_count: number;
  user_has_recommended?: boolean;
}

export default function BookList({
  initialBooks = [],
}: {
  initialBooks?: BookProps[];
}) {
  const [books, setBooks] = useState<BookProps[]>(initialBooks);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`)
        .order('recommendation_count', { ascending: false });

      if (error) throw error;

      // 현재 사용자가 추천했는지 확인
      if (user && data) {
        const { data: userRecommendations } = await supabase
          .from('book_recommendations')
          .select('book_id')
          .eq('user_id', user.id);

        const recommendedBookIds = new Set(
          userRecommendations?.map((rec) => rec.book_id) || []
        );

        const booksWithRecommendation = data.map((book) => ({
          ...book,
          user_has_recommended: recommendedBookIds.has(book.id),
        }));

        setBooks(booksWithRecommendation);
      } else {
        setBooks(data || []);
      }
    } catch (error) {
      console.error('도서 검색 실패:', error);
      showToast('도서를 검색하는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommend = async (bookId: string) => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    try {
      const supabase = createClient();

      // 이미 추천했는지 확인
      const { data: existingRec } = await supabase
        .from('book_recommendations')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle();

      if (existingRec) {
        // 추천 취소
        await supabase
          .from('book_recommendations')
          .delete()
          .eq('id', existingRec.id);

        // Books 테이블 카운트 감소
        await supabase.rpc('decrement_book_recommendation', {
          book_id: bookId,
        });

        showToast('도서 추천을 취소했습니다.', 'success');

        // UI 업데이트
        setBooks((prev) =>
          prev.map((book) =>
            book.id === bookId
              ? {
                  ...book,
                  recommendation_count: book.recommendation_count - 1,
                  user_has_recommended: false,
                }
              : book
          )
        );
      } else {
        // 추천 추가
        await supabase.from('book_recommendations').insert({
          user_id: user.id,
          book_id: bookId,
          created_at: new Date().toISOString(),
        });

        // Books 테이블 카운트 증가
        await supabase.rpc('increment_book_recommendation', {
          book_id: bookId,
        });

        showToast('도서를 추천했습니다.', 'success');

        // UI 업데이트
        setBooks((prev) =>
          prev.map((book) =>
            book.id === bookId
              ? {
                  ...book,
                  recommendation_count: book.recommendation_count + 1,
                  user_has_recommended: true,
                }
              : book
          )
        );
      }
    } catch (error) {
      console.error('도서 추천 처리 실패:', error);
      showToast('도서 추천 처리에 실패했습니다.', 'error');
    }
  };

  return (
    <div>
      {/* 검색창 */}
      <div className="mb-6 flex">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="도서 제목 또는 저자 검색"
          className="flex-1 rounded-l-lg border border-gray-300 px-4 py-2 focus:border-gold-start focus:outline-none"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="flex items-center rounded-r-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <Search className="mr-2 h-5 w-5" />
              검색
            </>
          )}
        </button>
      </div>

      {/* 도서 추천 버튼 */}
      <div className="mb-6 flex justify-end">
        <Link
          href="/study/book/recommend"
          className="flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
        >
          <Book className="mr-2 h-5 w-5" />새 도서 추천하기
        </Link>
      </div>

      {/* 도서 목록 */}
      {books.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {books.map((book) => (
            <div
              key={book.id}
              className="flex flex-col rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex justify-center">
                {book.cover_url ? (
                  <Image
                    src={book.cover_url}
                    alt={book.title}
                    width={200}
                    height={180}
                    unoptimized={true}
                    className="rounded object-cover shadow"
                  />
                ) : (
                  <div className="flex h-[180px] w-[120px] items-center justify-center rounded bg-gray-200 shadow">
                    <Book className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              <Link
                href={`/study/book/${book.id}`}
                className="mb-1 line-clamp-2 text-lg font-semibold hover:text-gold-start"
              >
                {book.title}
              </Link>

              <p className="mb-2 text-gray-600">{book.author}</p>

              {book.description && (
                <p className="mb-3 line-clamp-3 text-sm text-gray-500">
                  {book.description}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center">
                  <Star className="mr-1 h-4 w-4 fill-amber-500 text-amber-500" />
                  <span>{book.rating.toFixed(1)}</span>
                </div>

                <button
                  onClick={() => handleRecommend(book.id)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                    book.user_has_recommended
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ThumbsUp
                    className={`h-4 w-4 ${book.user_has_recommended ? 'fill-white' : ''}`}
                  />
                  <span>{book.recommendation_count}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-white py-12 text-center">
          <Book className="mb-4 h-16 w-16 text-gray-300" />
          <p className="mb-4 text-gray-500">검색 결과가 없습니다.</p>
          <p className="text-sm text-gray-500">새로운 도서를 추천해보세요!</p>
        </div>
      )}
    </div>
  );
}
