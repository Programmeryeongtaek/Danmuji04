'use client';

import { FormEvent, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import Image from 'next/image';
import { Book, Search } from 'lucide-react';

interface BookSearchProps {
  onSelect: (book: BookItem) => void;
}

interface BookItem {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  cover: string;
  description: string;
}

// 알라딘 API 응답 타입 정의
interface AladinBookItem {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  cover: string;
  description?: string;
  link?: string;
  categoryName?: string;
  priceSales?: number;
  priceStandard?: number;
}

interface AladinResponse {
  version: string;
  logo: string;
  title: string;
  link: string;
  pubDate: string;
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  query: string;
  searchCategoryId: number;
  searchCategoryName: string;
  item: AladinBookItem[];
}

export default function BookSearch({ onSelect }: BookSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<BookItem[]>([]);
  const { showToast } = useToast();

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/books/search?query=${encodeURIComponent(searchQuery)}`
      );
      const data = (await response.json()) as AladinResponse;

      if (!response.ok) {
        const errorMsg =
          (data as { error?: string }).error ?? '도서 검색에 실패했습니다.';
        throw new Error(errorMsg);
      }

      // 알라딘 API 응답 형식에 맞게 데이터 매핑
      const books: BookItem[] = data.item.map((item: AladinBookItem) => ({
        isbn: item.isbn,
        title: item.title,
        author: item.author,
        publisher: item.publisher,
        pubDate: item.pubDate,
        cover: item.cover,
        description: item.description || '',
      }));

      setSearchResults(books);

      if (books.length === 0) {
        showToast('검색 결과가 없습니다.', 'info');
      }
    } catch (error) {
      console.error('도서 검색 실패:', error);
      showToast('도서 검색에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold">도서 검색</h3>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="도서 제목 또는 저자 검색"
            className="flex-1 rounded-lg border p-2 focus:border-gold-start focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white disabled:opacity-50"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>

      <div className="max-h-96 overflow-y-auto">
        {searchResults.length > 0 ? (
          <div className="space-y-4">
            {searchResults.map((book) => (
              <div
                key={book.isbn}
                className="flex cursor-pointer gap-3 rounded-lg border p-3 hover:bg-gray-50"
                onClick={() => onSelect(book)}
              >
                <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                  {book.cover ? (
                    <Image
                      src={book.cover}
                      alt={book.title}
                      width={64}
                      height={96}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Book className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-hidden">
                  <h4 className="truncate font-medium">{book.title}</h4>
                  <p className="text-sm text-gray-600">{book.author}</p>
                  <p className="text-sm text-gray-500">
                    {book.publisher} | {book.pubDate}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery && !isLoading ? (
          <div className="py-8 text-center text-gray-500">
            도서 검색 결과가 없습니다.
          </div>
        ) : null}
      </div>
    </div>
  );
}
