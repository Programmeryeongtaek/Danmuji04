'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../common/Toast/Context';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, X } from 'lucide-react';
import { FilterOptions, Post } from '@/app/types/community/communityType';
import { searchPosts } from '@/utils/services/community/postService';
import SearchFilterSection from './SearchFilterSection';
import SearchResultItem from './SearchResultItem';
import Pagination from '../common/Pagination';

const ALLOWED_IMAGE_HOSTS = [
  'hcqusfewtyxmpdvzpeor.supabase.co',
  'picsum.photos',
];

export default function CommunitySearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { showToast } = useToast();

  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(query);
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    period: 'all',
    sort: 'recent',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const postsPerPage = 10;

  useEffect(() => {
    const fetchSearchResults = async () => {
      setIsLoading(true);

      if (!query.trim()) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }

      try {
        const results = await searchPosts(query, filters);
        setSearchResults(results);
      } catch (error) {
        console.error('검색 중 오류 발생:', error);
        showToast('검색 결과를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, filters, showToast]);

  // 검색 핸들러
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();

    if (!currentSearchTerm.trim()) return;

    const url = new URL(window.location.href);
    url.searchParams.set('q', currentSearchTerm);

    if (filters.category && filters.category !== 'all') {
      url.searchParams.set('category', filters.category);
    } else {
      url.searchParams.delete('category');
    }

    router.push(url.toString());
  };

  // 필터 적용
  const applyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // 페이지네이션 계산
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentResults = searchResults.slice(indexOfFirstPost, indexOfLastPost);

  // 텍스트 하이라이트 함수
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;

    try {
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 px-0 py-0">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-Kr', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('ko-Kr', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 이미지 URL 추출 (최대 3개)
  const extractImages = (content: string): string[] => {
    if (!content) return [];

    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    const matches = [...content.matchAll(imageRegex)];
    const imageUrls = matches.map((match) => match[1]).slice(0, 3);

    return imageUrls;
  };

  // 내용 미리보기 (이미지 마크다운 제외)
  const getContentPreview = (
    content: string,
    maxLength: number = 150
  ): string => {
    if (!content) return '';

    const contentWithoutImages = content.replace(/!\[.*?\]\(.*?\)/g, '');

    if (contentWithoutImages.length <= maxLength) {
      return contentWithoutImages;
    }

    return contentWithoutImages.substring(0, maxLength) + '...';
  };

  // URL이 허용된 이미지 호스트인지 확인
  const isAllowedImageHost = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return ALLOWED_IMAGE_HOSTS.some((host) => urlObj.hostname.includes(host));
    } catch {
      return false;
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <Link href="/community" className="text-gray-600 hover:text-gray-900">
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </div>

      {/* 검색 헤더 */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">검색 결과</h1>
        {query && (
          <p className="text-gray-600">
            <strong>{query}</strong>에 대한 검색 결과 {searchResults.length}개
          </p>
        )}
      </div>

      {/* 검색창 */}
      <div className="mb-6 flex gap-4 mobile:justify-between">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="검색어를 입력하세요."
            value={currentSearchTerm}
            onChange={(e) => setCurrentSearchTerm(e.target.value)}
            className="w-full rounded-lg border px-10 py-3 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
          />
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          {currentSearchTerm && (
            <button
              type="button"
              onClick={() => setCurrentSearchTerm('')}
              className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-gold-start p-1 text-white"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        <SearchFilterSection
          showFilters={showFilters}
          filters={filters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onApplyFilters={applyFilters}
        />
      </div>

      {/* 검색 결과 */}
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="group inline-block h-8 w-8 animate-spin rounded-full border-4 border-gold-start border-b-transparent"></div>
          <p className="mt-2 text-gray-600">검색 중...</p>
        </div>
      ) : currentResults.length > 0 ? (
        <div className="space-y-6">
          {currentResults.map((post) => (
            <SearchResultItem
              key={post.id}
              post={post}
              searchQuery={query}
              formatDate={formatDate}
              highlightText={highlightText}
              extractImages={extractImages}
              getContentPreview={getContentPreview}
              isAllowedImageHost={isAllowedImageHost}
            />
          ))}
        </div>
      ) : query ? (
        <div className="rounded-lg border bg-gray-50 py-12 text-center">
          <p className="text-gray-500">검색 결과가 없습니다.</p>
          <p className="mt-2 text-sm text-gray-400">
            다른 검색어로 다시 시도해보세요.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-gray-50 py-12 text-center">
          <p className="text-gray-500">검색어를 입력해주세요.</p>
        </div>
      )}

      {/* 페이지네이션 */}
      <Pagination.Root
        currentPage={currentPage}
        totalItems={searchResults.length}
        itemsPerPage={postsPerPage}
        onPageChange={setCurrentPage}
      >
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-2">
            <Pagination.Control direction="prev" />
            <Pagination.List />
            <Pagination.Control direction="next" />
          </div>
        </div>
      </Pagination.Root>
    </div>
  );
}
