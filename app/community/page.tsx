'use client';

import { useToast } from '@/components/common/Toast/Context';
import LoginModal from '@/components/home/LoginModal';
import { userAtom } from '@/store/auth';
import {
  fetchPopularTags,
  fetchPosts,
  FilterOptions,
  Post,
} from '@/utils/services/communityService';
import { useAtomValue } from 'jotai';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Eye,
  HelpCircle,
  ListFilter,
  Logs,
  MessageCircle,
  MessageSquare,
  PlusCircle,
  Search,
  ThumbsUp,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

// 커뮤니티 카테고리 정의
const communityCategories = [
  {
    id: 'all',
    label: '전체',
    icon: Logs,
    description: '모든 게시글을 확인하세요',
  },
  {
    id: 'notice',
    label: '공지사항',
    icon: Bell,
    description: '중요한 공지사항을 확인하세요',
  },
  {
    id: 'chats',
    label: '자유게시판',
    icon: MessageCircle,
    description: '다양한 주제로 자유롭게 대화해보세요',
  },
  {
    id: 'faq',
    label: '질문 게시판',
    icon: HelpCircle,
    description: '궁금한 점을 질문하고 답변을 받아보세요',
  },
];

// 정렬 옵션
const sortOptions = [
  { value: 'recent', label: ' 최신순' },
  { value: 'likes', label: '좋아요순' },
];

export default function CommunityPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  // URL 파라미터에서 초기값 가져오기
  const initialCategory = searchParams.get('category') || 'all';
  const initialTag = searchParams.get('tag') || null;

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [popularTags, setPopularTags] = useState<
    { name: string; count: number }[]
  >([]);
  const [sortBy, setSortBy] = useState<FilterOptions['sort']>('recent');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showTagSection, setShowTagSection] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);

  const postsPerPage = 10; // 페이지당 게시글 수

  // 게시글 및 인기 태그 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // 필터 옵션 설정
        const filterOptions: FilterOptions = {
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          sort: sortBy,
          tag: selectedTag || undefined,
        };

        // 게시글 로드
        const postsData = await fetchPosts(filterOptions);
        setPosts(postsData);
        setTotalPosts(postsData.length);

        // 인기 태그 로드
        const tagsData = await fetchPopularTags(10);
        setPopularTags(tagsData);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        showToast('게시글을 불러오는데 실패헀습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedCategory, sortBy, selectedTag, showToast]);

  useEffect(() => {
    // URL 에러 메시지 확인
    const error = searchParams.get('error');
    if (error === 'post-not-found') {
      showToast('게시글을 찾을 수 없습니다.', 'error');
    }
  }, [searchParams, showToast]);

  // URL 파라미터가 변경될 때마다 카테고리 업데이트
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, [searchParams]); // searchParams가 변경될 때마다 실행

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); //  카테고리 변경 시 페이지 초기화

    // URL 업데이트
    const url = new URL(window.location.href);
    url.searchParams.set('category', categoryId);

    if (selectedTag) {
      url.searchParams.set('tag', selectedTag);
    }

    router.push(url.toString());
  };

  // 태그 클릭 핸들러
  const handleTagClick = (tag: string) => {
    const newTag = selectedTag === tag ? null : tag;
    setSelectedTag(newTag);
    setCurrentPage(1); // 태그 변경 시 페이지 초기화

    // URL 업데이트
    const url = new URL(window.location.href);

    if (newTag) {
      url.searchParams.set('tag', newTag);
    } else {
      url.searchParams.delete('tag');
    }

    router.push(url.toString());
  };

  // 검색 핸들러
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(
        `/community/search?q=${encodeURIComponent(searchTerm.trim())}`
      );
    }
  };

  // 글 작성 버튼 클릭 핸들러
  const handleWriteClick = () => {
    if (!user) {
      showToast('로그인이 필요합니다', 'error');
      setIsLoginModalOpen(true);
      return;
    }

    router.push('/community/write');
  };

  // 페이지네이션 계산
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  // 페이지 변경 핸들러
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">커뮤니티</h1>
        <p className="text-gray-600">
          다양한 주제로 소통하고 정보를 나눠보세요
        </p>
      </div>

      {/* 카테고리 탭 */}
      <div className="mb-8 flex overflow-x-auto rounded-lg border">
        {communityCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`flex min-w-[120px] flex-1 flex-col items-center justify-center p-4 transition-colors ${
              selectedCategory === category.id
                ? 'bg-gold-start/10 text-gold-start'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <category.icon className="mb-2 h-6 w-6" />
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {/* 현재 선택된 카테고리 설명 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold">
          {communityCategories.find((c) => c.id === selectedCategory)?.label}
        </h2>
        <p className="text-gray-600">
          {
            communityCategories.find((c) => c.id === selectedCategory)
              ?.description
          }
        </p>
      </div>

      {/* 인기 태그 섹션 */}
      <div className="mb-6 rounded-lg border bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">인기 태그</h3>
          <button
            onClick={() => setShowTagSection(!showTagSection)}
            className="text-gray-500 hover:text-gray-700"
          >
            {showTagSection ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>

        {showTagSection && (
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => handleTagClick(tag.name)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                  selectedTag === tag.name
                    ? 'bg-gold-start text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                #{tag.name}
                <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                  {tag.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 검색 및 작성 버튼 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="검색어를 입력하세요"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border px-10 py-2 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
          />
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <button type="submit" className="sr-only">
            검색
          </button>
        </form>

        <div className="flex items-center gap-3">
          {/* 정렬 옵션 */}
          <div className="relative">
            <button
              onClick={() => setShowSortOptions(!showSortOptions)}
              className="flex items-center gap-1 rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <ListFilter className="h-5 w-5" />
              <span>
                {sortOptions.find((option) => option.value === sortBy)?.label}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showSortOptions && (
              <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border bg-white shadow-lg">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value as FilterOptions['sort']);
                      setShowSortOptions(false);
                    }}
                    className={`flex w-full items-center px-4 py-2 text-left hover:bg-gray-50 ${
                      sortBy === option.value ? 'bg-gray-100 font-medium' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleWriteClick}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition-all hover:bg-gradient-to-l"
          >
            <PlusCircle className="h-5 w-5" />
            <span>글 작성하기</span>
          </button>
        </div>
      </div>

      {/* 선택된 필터 표시 */}
      {selectedTag && (
        <div className="mb-4 flex items-center">
          <span className="mr-2 text-sm text-gray-600">적용된 필터:</span>
          <div className="flex items-center gap-1 rounded-full bg-gold-start px-3 py-1 text-xs text-white">
            #{selectedTag}
            <button
              onClick={() => handleTagClick(selectedTag)}
              className="ml-1 rounded-full hover:bg-gold-end/30"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* 게시글 목록 */}
      <div className="rounded-lg border">
        {/* 헤더 */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b bg-gray-50 p-4 font-medium text-gray-700">
          <div className="min-w-[80px] text-center">카테고리</div>
          <div>제목</div>
          <div className="min-w-[80px] text-center">작성자</div>
          <div className="min-w-[80px] text-center">조회수</div>
          <div className="min-w-[120px] text-center">작성일</div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gold-start border-b-transparent"></div>
            <p className="mt-2 text-gray-600">게시글을 불러오는 중...</p>
          </div>
        ) : currentPosts.length > 0 ? (
          currentPosts.map((post) => (
            <div
              key={post.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b p-4 hover:bg-gray-50"
            >
              <div className="min-w-[80px] text-center">
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
              </div>
              <div className="font-medium">
                <Link
                  href={`/community/post/${post.id}`}
                  className="group flex items-start gap-2"
                >
                  <span className="group-hover:text-gold-start">
                    {post.title}
                  </span>

                  {/* 태그 목록 (모바일에서는 숨김) */}
                  <div className="hidden sm:flex sm:flex-wrap sm:gap-1">
                    {post.tags &&
                      post.tags.length > 0 &&
                      post.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-gray-100 px-1.5 text-xs text-gray-600"
                          onClick={(e) => {
                            e.preventDefault();
                            handleTagClick(tag);
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>

                  {post.comments_count && post.comments_count > 0 ? (
                    <span className="ml-1 rounded bg-gold-start/10 px-1.5 text-sm font-normal text-gold-start">
                      {post.comments_count}
                    </span>
                  ) : null}
                </Link>

                {/* 게시글 부가 정보 (모바일에서 표시) */}
                <div className="mt-1 flex items-center gap-3 sm:hidden">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Eye className="h-3 w-3" />
                    <span>{post.views}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MessageSquare className="h-3 w-3" />
                    <span>{post.comments_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{post.likes_count || 0}</span>
                  </div>
                </div>
              </div>
              <div className="min-w-[80px] text-center text-sm text-gray-600">
                <div className="flex items-center justify-center gap-1">
                  <div className="relative h-5 w-5 overflow-hidden rounded-full bg-gray-200">
                    {post.author_avatar ? (
                      <Image
                        src={post.author_avatar}
                        alt={post.author_name || ''}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                        {post.author_name
                          ? post.author_name.charAt(0).toUpperCase()
                          : '?'}
                      </div>
                    )}
                  </div>
                  <span>{post.author_name}</span>
                </div>
              </div>
              <div className="min-w-[80px] text-center text-sm text-gray-600">
                {post.views}
              </div>
              <div className="min-w-[120px] text-center text-sm text-gray-600">
                {formatDate(post.created_at)}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">게시글이 없습니다</div>
        )}
      </div>

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

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
