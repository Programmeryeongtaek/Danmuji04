'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../common/Toast/Context';
import { FormEvent, useEffect, useState } from 'react';
import {
  FilterOptions,
  Post,
  searchPosts,
} from '@/utils/services/communityService';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Eye,
  Filter,
  MessageSquare,
  Search,
  ThumbsUp,
  X,
} from 'lucide-react';
import Image from 'next/image';

// 커뮤니티 카테고리 정의
const communityCategories = [
  {
    id: 'all',
    label: '전체',
  },
  {
    id: 'notice',
    label: '공지사항',
  },
  {
    id: 'chats',
    label: '자유게시판',
  },
  {
    id: 'study',
    label: '스터디',
  },
  {
    id: 'faq',
    label: '질문 게시판',
  },
];

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
  const [totalResults, setTotalResults] = useState(0);

  const postsPerPage = 10;

  useEffect(() => {
    const fetchSearchResults = async () => {
      setIsLoading(true);

      if (!query.trim()) {
        setSearchResults([]);
        setTotalResults(0);
        setIsLoading(false);
        return;
      }

      try {
        // 검색 실행
        const results = await searchPosts(query, filters);
        setSearchResults(results);
        setTotalResults(results.length);
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

    // 카테고리 필터가 'all'이 아닌 경우에만 URL에 추가
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
    setCurrentPage(1); // 필터 변경 시 페이지 초기화
  };

  // 페이지네이션 계산
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentResults = searchResults.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(totalResults / postsPerPage);

  // 페이지 변경 핸들러
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
      // 정규식 오류 방지 (특수문자 등) - error 변수를 사용하지 않도록 수정
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
      // 오늘
      return date.toLocaleTimeString('ko-Kr', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays < 7) {
      // 일주일 이내
      return `${diffDays}일 전`;
    } else {
      // 일주일 이상
      return date.toLocaleDateString('ko-Kr', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // 이미지 URL 추출 (최대 3개)
  const extractImages = (content: string): string[] => {
    if (!content) return [];

    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    const matches = [...content.matchAll(imageRegex)];
    const imageUrls = matches.map((match) => match[1]).slice(0, 3); // 최대 3개로 제한

    return imageUrls;
  };

  // 내용 미리보기 (이미지 마크다운 제외)
  const getContentPreview = (
    content: string,
    maxLength: number = 150
  ): string => {
    if (!content) return '';

    // 이미지 마크다운 제거
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
      // 호스트명뿐만 아니라 경로도 검사
      return ALLOWED_IMAGE_HOSTS.some((host) => urlObj.hostname.includes(host));
    } catch {
      return false;
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <Link
          href="/community"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-5 w-5" />
          <span>커뮤니티로 돌아가기</span>
        </Link>
      </div>

      {/* 검색 헤더 */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">검색 결과</h1>
        {query && (
          <p className="text-gray-600">
            <strong>{query}</strong>에 대한 검색 결과 {totalResults}개
          </p>
        )}
      </div>

      {/* 검색창 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="검색어를 입력하세요"
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-5 w-5" />
            <span className="hidden sm:inline">필터</span>
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* 필터 옵션 */}
      {showFilters && (
        <div className="mb-6 rounded-lg border bg-white p-4 shadow-md">
          <h2 className="mb-3 font-medium">검색 필터</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* 카테고리 필터 */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                카테고리
              </h3>
              <div className="flex flex-wrap gap-2">
                {communityCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() =>
                      applyFilters({ ...filters, category: category.id })
                    }
                    className={`rounded-lg px-3 py-1 text-sm ${
                      filters.category === category.id
                        ? 'bg-gold-start text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 기간 필터 */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-500">기간</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyFilters({ ...filters, period: 'all' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.period === 'all'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => applyFilters({ ...filters, period: 'day' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.period === 'day'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  오늘
                </button>
                <button
                  onClick={() => applyFilters({ ...filters, period: 'week' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.period === 'week'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  이번 주
                </button>
                <button
                  onClick={() => applyFilters({ ...filters, period: 'month' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.period === 'month'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  이번 달
                </button>
              </div>
            </div>

            {/* 정렬 필터 */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-500">정렬</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyFilters({ ...filters, sort: 'recent' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.sort === 'recent'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  최신순
                </button>
                <button
                  onClick={() => applyFilters({ ...filters, sort: 'likes' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.sort === 'likes'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  좋아요순
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                applyFilters({
                  category: 'all',
                  period: 'all',
                  sort: 'recent',
                });
              }}
              className="mr-2 rounded-lg border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="rounded-lg bg-gold-start px-3 py-1 text-sm text-white hover:opacity-90"
            >
              필터 적용
            </button>
          </div>
        </div>
      )}

      {/* 검색 결과 */}
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gold-start border-b-transparent"></div>
          <p className="mt-2 text-gray-600">검색 중...</p>
        </div>
      ) : currentResults.length > 0 ? (
        <div className="space-y-6">
          {currentResults.map((post) => {
            // 이미지 URL 추출 (최대 3개)
            const imageUrls = extractImages(post.content || '');
            // 내용 미리보기 (이미지 마크다운 제외)
            const contentPreview = getContentPreview(post.content || '');

            return (
              <div
                key={post.id}
                className="rounded-lg border p-4 hover:border-gold-start hover:bg-gray-50"
              >
                <Link href={`/community/post/${post.id}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        post.category === 'notice'
                          ? 'bg-red-100 text-red-800'
                          : post.category === 'faq'
                            ? 'bg-blue-100 text-blue-800'
                            : post.category === 'study'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {
                        communityCategories.find((c) => c.id === post.category)
                          ?.label
                      }
                    </span>
                    <div className="text-xs text-gray-500">
                      {formatDate(post.created_at)}
                    </div>
                  </div>

                  <h2 className="mb-2 text-lg font-medium">
                    {highlightText(post.title, query)}
                  </h2>

                  {contentPreview && (
                    <p className="mb-3 text-gray-600">
                      {highlightText(contentPreview, query)}
                    </p>
                  )}

                  {/* 이미지 미리보기 (최대 3개) */}
                  {/* 이미지 미리보기 (최대 3개) */}
                  {imageUrls.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {imageUrls.map((url, index) => (
                        <div
                          key={index}
                          className="relative h-24 w-24 overflow-hidden rounded-lg border bg-gray-100"
                        >
                          {/* 모든 이미지를 일반 img 태그로 처리하여 Next.js 이미지 최적화 우회 */}
                          <Image
                            src={url}
                            alt={`게시글 이미지 ${index + 1}`}
                            fill
                            unoptimized={true}
                            className="object-cover"
                            sizes="96px"
                            onError={(e) => {
                              // 이미지 로드 실패 시 기본 이미지로 대체
                              (e.target as HTMLImageElement).src =
                                '/images/placeholder.png';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {post.tags && post.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {post.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700"
                        >
                          #{highlightText(tag, query)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
                        {post.author_avatar &&
                        isAllowedImageHost(post.author_avatar) ? (
                          <Image
                            src={post.author_avatar}
                            alt={post.author_name || ''}
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                          />
                        ) : post.author_avatar ? (
                          <Image
                            src={post.author_avatar}
                            alt={post.author_name || ''}
                            unoptimized={true}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-500">
                            {post.author_name
                              ? post.author_name.charAt(0).toUpperCase()
                              : '?'}
                          </div>
                        )}
                      </div>
                      <span className="text-sm">{post.author_name}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{post.views}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{post.comments_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{post.likes_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
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
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`rounded border px-3 py-1 text-sm ${
                currentPage === 1
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              이전
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // 현재 페이지 앞뒤로 2페이지씩만 표시하고, 첫 페이지와 마지막 페이지는 항상 표시
                const diff = Math.abs(page - currentPage);
                return diff <= 2 || page === 1 || page === totalPages;
              })
              .map((page, i, filteredPages) => {
                // 페이지 번호 사이에 ... 표시
                const prevPage = filteredPages[i - 1];
                const showEllipsis = prevPage && page - prevPage > 1;

                return (
                  <div key={page}>
                    {showEllipsis && (
                      <span className="flex h-8 w-8 items-center justify-center">
                        ...
                      </span>
                    )}
                    <button
                      onClick={() => paginate(page)}
                      className={`h-8 w-8 rounded ${
                        currentPage === page
                          ? 'bg-gold-start text-white'
                          : 'border text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`rounded border px-3 py-1 text-sm ${
                currentPage === totalPages
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
