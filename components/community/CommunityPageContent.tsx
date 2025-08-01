'use client';

import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../common/Toast/Context';
import { FormEvent, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import LoginModal from '../home/LoginModal';
import { FilterOptions, Post } from '@/app/types/community/communityType';
import {
  fetchPopularTags,
  fetchPosts,
} from '@/utils/services/community/postService';
import CommunityCategoryTabs from './CommunityCategoryTabs';
import CommunityHeader from './CommunityHeader';
import PopularTagsSections from './PopularTagsSection';
import PostList from './PostList';
import Pagination from '../common/Pagination';

export default function CommunityPageContent() {
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

  const postsPerPage = 10;

  // 게시글 및 인기 태그 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const filterOptions: FilterOptions = {
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          sort: sortBy,
          tag: selectedTag || undefined,
        };

        const [postsData, tagsData] = await Promise.all([
          fetchPosts(filterOptions),
          fetchPopularTags(10),
        ]);

        setPosts(postsData);
        setPopularTags(tagsData);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedCategory, sortBy, selectedTag, showToast]);

  // URL 에러 메시지 확인
  useEffect(() => {
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
  }, [searchParams]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);

    const url = new URL(window.location.href);
    url.searchParams.set('category', categoryId);

    if (selectedTag) {
      url.searchParams.set('tag', selectedTag);
    }

    router.push(url.toString());
  };

  const handleTagClick = (tag: string) => {
    const newTag = selectedTag === tag ? null : tag;
    setSelectedTag(newTag);
    setCurrentPage(1);

    const url = new URL(window.location.href);

    if (newTag) {
      url.searchParams.set('tag', newTag);
    } else {
      url.searchParams.delete('tag');
    }

    router.push(url.toString());
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(
        `/community/search?q=${encodeURIComponent(searchTerm.trim())}`
      );
    }
  };

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

  return (
    <div className="mx-auto max-w-6xl py-12 mobile:mb-10 mobile:px-4 tablet:mb-0 tablet:px-6">
      <div className="mobile:mb-4 tablet:mb-6 laptop:mb-8">
        <h1 className="mb-2 text-3xl font-bold">커뮤니티</h1>
      </div>

      <CommunityCategoryTabs
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      <CommunityHeader
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearch={handleSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showSortOptions={showSortOptions}
        onToggleSortOptions={() => setShowSortOptions(!showSortOptions)}
        onWriteClick={handleWriteClick}
        user={user}
      />

      <PopularTagsSections
        popularTags={popularTags}
        selectedTag={selectedTag}
        showTagSection={showTagSection}
        onToggleTagSection={() => setShowTagSection(!showTagSection)}
        onTagClick={handleTagClick}
      />

      {/* 선택된 필터 표시 */}
      {selectedTag && (
        <div className="mb-4 flex items-center">
          <span className="mr-2 text-sm text-gray-600">태그:</span>
          <div className="flex items-center gap-1 rounded-full bg-gold-start px-3 py-1 text-xs text-black">
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

      <PostList
        posts={currentPosts}
        isLoading={isLoading}
        onTagClick={handleTagClick}
      />

      {/* 페이지네이션 */}
      <Pagination.Root
        currentPage={currentPage}
        totalItems={posts.length}
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

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
