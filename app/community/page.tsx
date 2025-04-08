'use client';

import { useToast } from '@/components/common/Toast/Context';
import LoginModal from '@/components/home/LoginModal';
import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import {
  Bell,
  BookOpen,
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
    id: 'study',
    label: '스터디',
    icon: BookOpen,
    description: '함께 공부하고 성장할 스터디를 찾아보세요',
  },
  {
    id: 'faq',
    label: '질문 게시판',
    icon: HelpCircle,
    description: '궁금한 점을 질문하고 답변을 받아보세요',
  },
];

// 인기 태그 데이터
const popularTags = [
  { name: 'JavaScript', count: 120 },
  { name: 'React', count: 98 },
  { name: 'TypeScript', count: 85 },
  { name: 'Next.js', count: 72 },
  { name: 'CSS', count: 65 },
  { name: 'Node.js', count: 58 },
];

// 더미 게시글 데이터
const dummyPosts = [
  {
    id: 1,
    title: 'Next.js에서 상태 관리 어떻게 하시나요?',
    content:
      'Next.js 프로젝트에서 상태 관리를 어떻게 하시는지 궁금합니다. Redux, Jotai, Zustand 등 어떤 것이 좋을까요?',
    author: '개발자123',
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
    profileImage: '/images/danmuji.png',
    category: 'notice',
    views: 310,
    comments: 2,
    likes: 45,
    createdAt: '2023-12-09T13:50:00',
    tags: ['공지', '점검'],
  },
  {
    id: 7,
    title: '개발자 취업 준비 어떻게 하고 계신가요?',
    content:
      '취업 준비 중인 신입 개발자입니다. 포트폴리오나 이력서 준비 팁 있으면 공유해주세요.',
    author: '취준생',
    profileImage: null,
    category: 'chats',
    views: 278,
    comments: 37,
    likes: 52,
    createdAt: '2023-12-07T11:25:00',
    tags: ['취업', '포트폴리오', '신입개발자'],
  },
  {
    id: 8,
    title: 'React Hooks 관련 질문입니다',
    content:
      'useEffect의 의존성 배열에 관한 질문이 있습니다. 특정 상황에서 무한 루프가 발생하는데 어떻게 해결하나요?',
    author: '리액트러버',
    profileImage: '/images/danmuji.png',
    category: 'faq',
    views: 194,
    comments: 21,
    likes: 34,
    createdAt: '2023-12-05T16:42:00',
    tags: ['React', 'Hooks', 'useEffect'],
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

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPosts, setFilteredPosts] = useState(dummyPosts);
  const [sortBy, setSortBy] = useState('recent');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showTagSection, setShowTagSection] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const postsPerPage = 2; // 페이지당 게시글 수

  useEffect(() => {
    // URL에서 카테고리 파라미터 가져오기
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }

    // URL에서 태그 파라미터 가져오기
    const tagParam = searchParams.get('tag');
    if (tagParam) {
      setSelectedTag(tagParam);
    }

    // 페이지 번호 초기화
    setCurrentPage(1);

    // 에러 메시지 확인
    const error = searchParams.get('error');
    if (error === 'post-not-found') {
      showToast('게시글을 찾을 수 없습니다.', 'error');
    }
  }, [searchParams, showToast]);

  // 카테고리와 검색어에 따라 게시글 필터링
  useEffect(() => {
    let filtered = [...dummyPosts];

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((post) => post.category === selectedCategory);
    }

    // 태그 필터링
    if (selectedTag) {
      filtered = filtered.filter(
        (post) =>
          post.tags &&
          post.tags.some(
            (tag) => tag.toLowerCase() === selectedTag.toLowerCase()
          )
      );
    }

    // 정렬
    switch (sortBy) {
      case 'recent':
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'likes':
        filtered.sort((a, b) => (b.likes = a.likes));
    }

    setFilteredPosts(filtered);
  }, [selectedCategory, sortBy, selectedTag]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); // 카테고리 변경 시 페이지 초기화

    // URL 업데이트 (깜박임 방지를 위해 히스토리 API 직접 사용)
    const url = new URL(window.location.href);
    url.searchParams.set('category', categoryId);

    if (selectedTag) {
      url.searchParams.set('tag', selectedTag);
    }

    window.history.pushState({}, '', url.toString());
  };

  // 태그 클릭 핸들러
  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      // 이미 선택된 태그를 다시 클릭하면 선택 해제
      setSelectedTag(null);

      const url = new URL(window.location.href);
      url.searchParams.set('tag', tag);
      window.history.pushState({}, '', url.toString());
    }
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
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

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
                      setSortBy(option.value);
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

        {currentPosts.length > 0 ? (
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

                  {post.comments > 0 && (
                    <span className="ml-1 rounded bg-gold-start/10 px-1.5 text-sm font-normal text-gold-start">
                      {post.comments}
                    </span>
                  )}
                </Link>

                {/* 게시글 부가 정보 (모바일에서 표시) */}
                <div className="mt-1 flex items-center gap-3 sm:hidden">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Eye className="h-3 w-3" />
                    <span>{post.views}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MessageSquare className="h-3 w-3" />
                    <span>{post.comments}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{post.likes}</span>
                  </div>
                </div>
              </div>
              <div className="min-w-[80px] text-center text-sm text-gray-600">
                <div className="flex items-center justify-center gap-1">
                  <div className="relative h-5 w-5 overflow-hidden rounded-full bg-gray-200">
                    {post.profileImage ? (
                      <Image
                        src={post.profileImage}
                        alt={post.author}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                        {post.author.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span>{post.author}</span>
                </div>
              </div>
              <div className="min-w-[80px] text-center text-sm text-gray-600">
                {post.views}
              </div>
              <div className="min-w-[120px] text-center text-sm text-gray-600">
                {formatDate(post.createdAt)}
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
