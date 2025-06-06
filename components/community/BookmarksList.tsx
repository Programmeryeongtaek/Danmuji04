'use client';

import { BookmarkIcon } from 'lucide-react';
import Link from 'next/link';
import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useToast } from '../common/Toast/Context';
import { BookmarkedPost } from '@/app/types/community/communityType';
import {
  deleteMultipleBookmarks,
  updateBookmarkImportance,
  updateBookmarkMemo,
} from '@/utils/services/community/bookmarkService';
import { fetchBookmarkedPosts } from '@/utils/services/community/postService';
import BookmarkFilterControls from './BookmarkFilterControls';
import BookmarkItem from './BookmarkItem';

// 중요도 옵션 상수 정의
const IMPORTANCE_OPTIONS = [
  { value: 0, label: '없음', color: 'bg-gray-200' },
  { value: 1, label: '낮음', color: 'bg-blue-400' },
  { value: 2, label: '중간', color: 'bg-yellow-400' },
  { value: 3, label: '높음', color: 'bg-red-400' },
];

// 카테고리 한글 이름 매핑
const CATEGORY_NAMES: Record<string, string> = {
  notice: '공지사항',
  faq: '질문 게시판',
  study: '스터디',
  chats: '자유게시판',
  all: '전체',
};

// 필터 타입 정의
type FilterType = 'latest' | 'category' | 'importance';

export default function BookmarksList() {
  const { showToast } = useToast();

  // 선택 모드 관련 상태
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<number>>(
    new Set()
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // 필터 및 정렬 상태
  const [filterType, setFilterType] = useState<FilterType>('latest');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [importanceFilter, setImportanceFilter] = useState<number | null>(null);

  // 북마크 목록을 내부 상태로 관리
  const [localBookmarks, setBookmarks] = useState<BookmarkedPost[]>([]);

  const {
    data: bookmarks,
    isLoading,
    hasMore,
    observerRef,
    error,
    reset,
  } = useInfiniteScroll<BookmarkedPost>({
    fetchData: async (page) => {
      try {
        const result = await fetchBookmarkedPosts(page, 10);
        return result;
      } catch (error) {
        console.error('북마크 데이터 로드 에러:', error);
        throw error;
      }
    },
    pageSize: 10,
    initialPage: 1,
    dependencies: [],
  });

  // 컴포넌트 마운트 시 한 번만 초기화
  useEffect(() => {
    return () => {
      if (reset) reset();
    };
  }, []);

  useEffect(() => {
    // 데이터 중복 방지를 위해 ID 기반으로 중복 제거
    const uniqueBookmarks = Array.from(
      new Map(bookmarks.map((item) => [item.id, item])).values()
    );
    setBookmarks(uniqueBookmarks);
  }, [bookmarks]);

  // 카테고리 목록 추출
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    localBookmarks.forEach((post) => {
      if (post.category) categorySet.add(post.category);
    });
    return Array.from(categorySet);
  }, [localBookmarks]);

  // 필터링 및 정렬된 북마크 계산
  const filteredBookmarks = useMemo(() => {
    const uniqueBookmarks = Array.from(
      new Map([...localBookmarks].map((item) => [item.id, item])).values()
    );

    let result = uniqueBookmarks;

    // 필터 적용
    if (filterType === 'category' && categoryFilter) {
      result = result.filter((post) => post.category === categoryFilter);
    } else if (filterType === 'importance' && importanceFilter !== null) {
      result = result.filter((post) => post.importance === importanceFilter);
    }

    // 정렬 로직
    if (filterType === 'category') {
      result.sort((a, b) => {
        if (a.category === b.category) {
          return (
            new Date(b.bookmark_created_at).getTime() -
            new Date(a.bookmark_created_at).getTime()
          );
        }
        return a.category.localeCompare(b.category);
      });
    } else if (filterType === 'importance') {
      result.sort((a, b) => {
        if (b.importance === a.importance) {
          return (
            new Date(b.bookmark_created_at).getTime() -
            new Date(a.bookmark_created_at).getTime()
          );
        }
        return b.importance - a.importance;
      });
    } else {
      result.sort((a, b) => {
        return (
          new Date(b.bookmark_created_at).getTime() -
          new Date(a.bookmark_created_at).getTime()
        );
      });
    }

    return result;
  }, [localBookmarks, filterType, categoryFilter, importanceFilter]);

  // 필터 타입 변경 핸들러
  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type);
    if (type === 'latest') {
      setCategoryFilter(null);
      setImportanceFilter(null);
    }
  };

  // 선택 모드 토글
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedBookmarks(new Set());
  };

  // 북마크 선택/해제
  const toggleBookmarkSelection = (
    postId: number,
    e: MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedBookmarks((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(postId)) {
        newSelected.delete(postId);
      } else {
        newSelected.add(postId);
      }
      return newSelected;
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedBookmarks.size === filteredBookmarks.length) {
      setSelectedBookmarks(new Set());
    } else {
      setSelectedBookmarks(new Set(filteredBookmarks.map((post) => post.id)));
    }
  };

  // 선택한 북마크 삭제
  const deleteSelectedBookmarks = async () => {
    if (selectedBookmarks.size === 0) return;

    try {
      setIsDeleting(true);
      const postIds = Array.from(selectedBookmarks);
      const deletedCount = await deleteMultipleBookmarks(postIds);

      setBookmarks((prev) =>
        prev.filter((bookmark) => !selectedBookmarks.has(bookmark.id))
      );
      setSelectionMode(false);
      setSelectedBookmarks(new Set());

      showToast(`${deletedCount}개의 북마크가 삭제되었습니다.`, 'success');

      setTimeout(() => {
        reset();
      }, 500);
    } catch (error) {
      console.error('북마크 삭제 중 오류 발생:', error);
      showToast('북마크 삭제에 실패했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 북마크 중요도 업데이트 핸들러
  const handleImportanceChange = async (
    postId: number,
    importance: number,
    e: MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const originalPost = localBookmarks.find(
      (bookmark) => bookmark.id === postId
    );
    const originalImportance = originalPost?.importance || 0;

    setBookmarks((prev) =>
      prev.map((bookmark) =>
        bookmark.id === postId ? { ...bookmark, importance } : bookmark
      )
    );

    try {
      await updateBookmarkImportance(postId, importance);
      showToast('중요도가 업데이트되었습니다.', 'success');
    } catch (error) {
      console.error('중요도 업데이트 실패:', error);
      setBookmarks((prev) =>
        prev.map((bookmark) =>
          bookmark.id === postId
            ? { ...bookmark, importance: originalImportance }
            : bookmark
        )
      );
      showToast('중요도 업데이트에 실패했습니다.', 'error');
    }
  };

  // 메모 저장 함수
  const handleMemoSave = async (postId: number, memo: string) => {
    try {
      await updateBookmarkMemo(postId, memo);
      setBookmarks((prev) =>
        prev.map((bookmark) =>
          bookmark.id === postId ? { ...bookmark, memo } : bookmark
        )
      );
      showToast('메모가 저장되었습니다.', 'success');
    } catch (error) {
      console.error('메모 저장 실패:', error);
      showToast('메모 저장에 실패했습니다.', 'error');
    }
  };

  // 카테고리 이름 가져오기
  const getCategoryName = (categoryId: string): string => {
    return CATEGORY_NAMES[categoryId] || categoryId;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-kr', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-kr', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // 로딩 중 표시
  if (isLoading && localBookmarks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-start border-b-transparent"></div>
        <span className="ml-2">북마크를 불러오는 중...</span>
      </div>
    );
  }

  // 데이터 없음 표시
  if (localBookmarks.length === 0 && !isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border bg-gray-50 p-8">
        <BookmarkIcon className="mb-2 h-12 w-12 text-gray-300" />
        <h3 className="mb-2 text-lg font-medium text-gray-600">
          북마크가 없습니다
        </h3>
        <p className="text-center text-gray-500">
          관심있는 게시글을 북마크해 보세요!
        </p>
        <Link
          href="/community"
          className="mt-4 rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white"
        >
          커뮤니티 둘러보기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="mb-4 text-xl font-bold">북마크한 게시글</h2>

      {localBookmarks.length > 0 && (
        <BookmarkFilterControls
          selectionMode={selectionMode}
          selectedCount={selectedBookmarks.size}
          totalCount={filteredBookmarks.length}
          isDeleting={isDeleting}
          filterType={filterType}
          categoryFilter={categoryFilter}
          importanceFilter={importanceFilter}
          categories={categories}
          importanceOptions={IMPORTANCE_OPTIONS}
          onToggleSelectionMode={toggleSelectionMode}
          onToggleSelectAll={toggleSelectAll}
          onDeleteSelected={deleteSelectedBookmarks}
          onFilterTypeChange={handleFilterTypeChange}
          onCategoryFilterChange={setCategoryFilter}
          onImportanceFilterChange={setImportanceFilter}
          getCategoryName={getCategoryName}
        />
      )}

      {/* 북마크 목록 */}
      {filteredBookmarks.length > 0 ? (
        filteredBookmarks.map((post, index) => (
          <BookmarkItem
            key={`bookmark-${post.id}-${index}`}
            post={post}
            selectionMode={selectionMode}
            isSelected={selectedBookmarks.has(post.id)}
            onToggleSelection={toggleBookmarkSelection}
            onImportanceChange={handleImportanceChange}
            onMemoSave={handleMemoSave}
            formatDate={formatDate}
            getCategoryName={getCategoryName}
            importanceOptions={IMPORTANCE_OPTIONS}
          />
        ))
      ) : (
        <div className="py-8 text-center text-gray-500">
          {localBookmarks.length > 0
            ? '선택한 필터에 맞는 북마크가 없습니다.'
            : '북마크가 없습니다.'}
        </div>
      )}

      {/* 무한 스크롤을 위한 관찰 요소 */}
      {hasMore ? (
        <div ref={observerRef} className="py-4">
          {isLoading && (
            <div className="flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gold-start"></div>
              <span className="ml-2 text-gray-600">더 불러오는 중...</span>
            </div>
          )}
        </div>
      ) : (
        localBookmarks.length > 0 && (
          <div className="py-4 text-center text-gray-500">
            모든 북마크를 불러왔습니다.
          </div>
        )
      )}

      {/* 에러 발생 시 표시 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-500">
          북마크를 불러오는데 실패했습니다. 다시 시도해주세요.
        </div>
      )}
    </div>
  );
}
