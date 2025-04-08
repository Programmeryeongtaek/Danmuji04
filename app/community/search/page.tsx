'use client';

import {
  ChevronLeft,
  Eye,
  Filter,
  Logs,
  MessageCircle,
  MessageSquare,
  Search,
  ThumbsUp,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// 더미 게시글 데이터
const dummyPosts = [
  {
    id: 1,
    title: 'Next.js에서 상태 관리 어떻게 하시나요?',
    content:
      'Next.js 프로젝트에서 상태 관리를 어떻게 하시는지 궁금합니다. Redux, Jotai, Zustand 등 어떤 것이 좋을까요?',
    author: '개발자123',
    authorId: 'user1',
    profileImage: '/images/danmuji.png',
    category: 'faq',
    views: 245,
    comments: 18,
    likes: 32,
    createdAt: '2023-12-15T14:23:00',
    tags: ['Next.js', 'React', '상태관리'],
  },
  {
    id: 2,
    title: '주말에 같이 코딩할 스터디원 모집합니다',
    content:
      '주말마다 모여서 함께 코딩하고 피드백을 나눌 스터디원을 모집합니다. 장소는 강남역 근처입니다.',
    author: '스터디장',
    authorId: 'user2',
    profileImage: null,
    category: 'study',
    views: 189,
    comments: 24,
    likes: 15,
    createdAt: '2023-12-14T09:45:00',
    tags: ['스터디', '모집', '코딩'],
  },
  {
    id: 3,
    title: '새로운 강의 오픈 안내',
    content:
      '12월 20일부터 "Next.js 마스터 클래스" 강의가 오픈됩니다. 많은 관심 부탁드립니다.',
    author: '관리자',
    authorId: 'admin',
    profileImage: '/images/danmuji.png',
    category: 'notice',
    views: 421,
    comments: 5,
    likes: 76,
    createdAt: '2023-12-13T16:30:00',
    tags: ['공지', '강의', 'Next.js'],
  },
  {
    id: 4,
    title: '요즘 읽고 있는 개발 서적 추천해주세요',
    content:
      '요즘 읽기 좋은 개발 관련 서적 추천 부탁드립니다. 주로 백엔드 개발을 하고 있습니다.',
    author: '책벌레',
    authorId: 'user3',
    profileImage: null,
    category: 'chats',
    views: 156,
    comments: 42,
    likes: 23,
    createdAt: '2023-12-11T10:15:00',
    tags: ['책', '추천', '백엔드'],
  },
  {
    id: 5,
    title: 'TypeScript 타입 추론 관련 질문입니다',
    content:
      'TypeScript에서 제네릭 타입 추론이 잘 안되는 경우가 있는데, 어떻게 해결하시나요?',
    author: '타입충',
    authorId: 'user4',
    profileImage: '/images/danmuji.png',
    category: 'faq',
    views: 203,
    comments: 15,
    likes: 28,
    createdAt: '2023-12-10T19:20:00',
    tags: ['TypeScript', '타입추론', '제네릭'],
  },
  {
    id: 6,
    title: '사이트 점검 안내',
    content:
      '12월 25일 오전 2시부터 4시까지 서버 점검이 있을 예정입니다. 이용에 참고 부탁드립니다.',
    author: '관리자',
    authorId: 'admin',
    profileImage: '/images/danmuji.png',
    category: 'notice',
    views: 310,
    comments: 2,
    likes: 45,
    createdAt: '2023-12-09T13:50:00',
    tags: ['공지', '점검'],
  },
];

// 커뮤니티 카테고리 정의
const communityCategories = [
  {
    id: 'all',
    label: '전체',
    icon: Logs,
  },
  {
    id: 'faq',
    label: '질문 게시판',
    icon: MessageCircle,
  },
  {
    id: 'chats',
    label: '자유게시판',
    icon: MessageCircle,
  },
  {
    id: 'study',
    label: '스터디',
    icon: MessageCircle,
  },
  {
    id: 'notice',
    label: '공지사항',
    icon: MessageCircle,
  },
];

// 필터 옵션 타입 정의
interface FilterOptions {
  category: string;
  period: 'all' | 'day' | 'week' | 'month' | 'year';
  sort: 'recent' | 'views' | 'likes' | 'comments';
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    period: 'all',
    sort: 'recent',
  });
  const [showFilters, setShowFilters] = useState(false);

  // 검색 결과 로드
  useEffect(() => {
    const fetchSearchResults = () => {
      setIsLoading(true);

      if (!query.trim()) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }

      // 검색어로 게시글 필터링
      let results = dummyPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(query.toLowerCase()) ||
          post.content.toLowerCase().includes(query.toLowerCase()) ||
          post.tags.some((tag) =>
            tag.toLowerCase().includes(query.toLowerCase())
          )
      );

      // 카테고리 필터링
      if (filters.category !== 'all') {
        results = results.filter((post) => post.category === filters.category);
      }

      // 기간 필터링
      if (filters.period !== 'all') {
        const now = new Date();
        const cutoffDate = new Date();

        switch (filters.period) {
          case 'day':
            cutoffDate.setDate(now.getDate() - 1);
            break;
          case 'week':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        results = results.filter(
          (post) => new Date(post.createdAt) >= cutoffDate
        );
      }

      // 정렬
      switch (filters.sort) {
        case 'recent':
          results.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
        case 'views':
          results.sort((a, b) => b.views - a.views);
          break;
        case 'likes':
          results.sort((a, b) => b.likes - a.likes);
          break;
        case 'comments':
          results.sort((a, b) => b.comments - a.comments);
          break;
      }

      setSearchResults(results);
      setIsLoading(false);
    };

    // 검색 실행
    const searchTimeout = setTimeout(fetchSearchResults, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, filters]);

  // 필터 적용
  const applyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  // 필드 강조 표시 함수
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));

    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
        <p className="text-gray-600">
          <strong>{query}</strong>에 대한 검색 결과 {searchResults.length}개
        </p>
      </div>

      {/* 검색창 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="검색어를 입력하세요"
            defaultValue={query}
            onChange={(e) => {
              const newUrl = new URL(window.location.href);
              const newQuery = e.target.value.trim();

              if (newQuery) {
                newUrl.searchParams.set('q', newQuery);
              } else {
                newUrl.searchParams.delete('q');
              }

              router.replace(newUrl.toString());
            }}
            className="w-full rounded-lg border px-10 py-3 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
          />
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          {query && (
            <button
              type="button"
              onClick={() => router.push('/community/search')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-5 w-5" />
            <span className="hidden sm:inline">필터</span>
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
                      setFilters({ ...filters, category: category.id })
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
                  onClick={() => setFilters({ ...filters, period: 'all' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.period === 'all'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFilters({ ...filters, period: 'day' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.period === 'day'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  오늘
                </button>
                <button
                  onClick={() => setFilters({ ...filters, period: 'week' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.period === 'week'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  이번 주
                </button>
                <button
                  onClick={() => setFilters({ ...filters, period: 'month' })}
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
                  onClick={() => setFilters({ ...filters, sort: 'recent' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.sort === 'recent'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  최신순
                </button>
                <button
                  onClick={() => setFilters({ ...filters, sort: 'views' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.sort === 'views'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  조회순
                </button>
                <button
                  onClick={() => setFilters({ ...filters, sort: 'likes' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.sort === 'likes'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  좋아요순
                </button>
                <button
                  onClick={() => setFilters({ ...filters, sort: 'comments' })}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    filters.sort === 'comments'
                      ? 'bg-gold-start text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  댓글순
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setFilters({
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
      ) : searchResults.length > 0 ? (
        <div className="space-y-6">
          {searchResults.map((post) => (
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
                    {formatDate(post.createdAt)}
                  </div>
                </div>

                <h2 className="mb-2 text-lg font-medium">
                  {highlightText(post.title, query)}
                </h2>

                <p className="mb-3 text-gray-600">
                  {highlightText(
                    post.content.length > 150
                      ? post.content.substring(0, 150) + '...'
                      : post.content,
                    query
                  )}
                </p>

                <div className="mb-2 flex flex-wrap gap-2">
                  {post.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700"
                    >
                      #{highlightText(tag, query)}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
                      {post.profileImage ? (
                        <img
                          src={post.profileImage}
                          alt={post.author}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-500">
                          {post.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm">{post.author}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{post.comments}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{post.likes}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
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
    </div>
  );
}
