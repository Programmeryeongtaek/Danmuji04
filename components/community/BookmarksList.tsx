'use client';

import {
  BookmarkIcon,
  CheckSquare,
  Edit,
  Eye,
  MessageSquare,
  Square,
  Star,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useToast } from '../common/Toast/Context';
import Button from '../common/Button/Button';
import { BookmarkedPost } from '@/app/types/community/communityType';

import {
  deleteMultipleBookmarks,
  updateBookmarkImportance,
  updateBookmarkMemo,
} from '@/utils/services/community/bookmarkService';
import { fetchBookmarkedPosts } from '@/utils/services/community/postService';

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
  // 열림 중요도 드롭다운 ID 추적
  const [openImportanceDropdown, setOpenImportanceDropdown] = useState<
    number | null
  >(null);

  // API 호출 상태 추적을 위한 플래그 추가
  const { showToast } = useToast();

  // 선택 모드 관련 상태 추가
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<number>>(
    new Set()
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // 필터 및 정렬 상태 수정
  const [filterType, setFilterType] = useState<FilterType>('latest');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [importanceFilter, setImportanceFilter] = useState<number | null>(null);

  // 북마크 목록을 내부 상태로 관리
  const [localBookmarks, setBookmarks] = useState<BookmarkedPost[]>([]);

  const [editingMemo, setEditingMemo] = useState<{
    postId: number;
    memo: string;
  } | null>(null);
  const memoInputRef = useRef<HTMLTextAreaElement>(null);

  const toggleImportanceDropdown = (
    postId: number,
    e: MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // 열려 있으면 닫고, 아니면 열기
    setOpenImportanceDropdown(
      openImportanceDropdown === postId ? null : postId
    );
  };

  // 필터 타입 변경 핸들러
  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type);

    // 필터 타입이 변경되면 하위 필터값 초기화
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
    e.preventDefault(); // 링크 이동 방지
    e.stopPropagation(); // 이벤트 버블링 방지

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
      // 모든 선택된 상태면 전체 해제
      setSelectedBookmarks(new Set());
    } else {
      // 아니면 전체 선택
      setSelectedBookmarks(new Set(filteredBookmarks.map((post) => post.id)));
    }
  };

  // 선택한 북마크 삭제
  const deleteSelectedBookmarks = async () => {
    if (selectedBookmarks.size === 0) return;

    try {
      setIsDeleting(true);
      const postIds = Array.from(selectedBookmarks);

      // API 호출 성공 여부 확인
      let deletedCount;
      try {
        deletedCount = await deleteMultipleBookmarks(postIds);
      } catch (apiError) {
        console.error('API 호출 에러:', apiError);
        throw apiError;
      }

      // UI 상태 업데이트 (즉시 화면에 반영)
      setBookmarks((prev) => {
        const filtered = prev.filter(
          (bookmark) => !selectedBookmarks.has(bookmark.id)
        );
        return filtered;
      });

      // 선택 모드 초기화
      setSelectionMode(false);
      setSelectedBookmarks(new Set());

      // 성공 메시지
      showToast(`${deletedCount}개의 북마크가 삭제되었습니다.`, 'success');

      // 데이터 새로고침 (UI 업데이트 후에 실행)
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

    // 기존 중요도 저장
    const originalPost = localBookmarks.find(
      (bookmark) => bookmark.id === postId
    );
    const originalImportance = originalPost?.importance || 0;

    // 낙관적 UI 업데이트
    setBookmarks((prev) =>
      prev.map((bookmark) =>
        bookmark.id === postId ? { ...bookmark, importance } : bookmark
      )
    );

    // 드롭다운 닫기
    setOpenImportanceDropdown(null);

    try {
      // API 호출
      await updateBookmarkImportance(postId, importance);
      showToast('중요도가 업데이트되었습니다.', 'success');
    } catch (error) {
      console.error('중요도 업데이트 실패:', error);
      showToast('중요도 업데이트에 실패했습니다.', 'error');

      // 실패 시 원래 상태로 롤백
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
    // 중복 제거
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
      // 최신순 정렬 (기본값)
      result.sort((a, b) => {
        return (
          new Date(b.bookmark_created_at).getTime() -
          new Date(a.bookmark_created_at).getTime()
        );
      });
    }

    return result;
  }, [localBookmarks, filterType, categoryFilter, importanceFilter]);

  // 카테고리 이름 가져오기 (한글로 변환)
  const getCategoryName = (categoryId: string): string => {
    return CATEGORY_NAMES[categoryId] || categoryId;
  };

  // 메모 편집 시작 함수
  const startEditingMemo = (
    post: BookmarkedPost,
    e: MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setEditingMemo({ postId: post.id, memo: post.memo || '' });

    // 다음 렌더링 후 input에 포커스
    setTimeout(() => {
      if (memoInputRef.current) {
        memoInputRef.current.focus();
      }
    }, 0);
  };

  // 메모 저장 함수
  const saveMemo = async () => {
    if (!editingMemo) return;

    try {
      await updateBookmarkMemo(editingMemo.postId, editingMemo.memo);

      // 현재 북마크 목록 업데이트
      setBookmarks((prev) =>
        prev.map((bookmark) =>
          bookmark.id === editingMemo.postId
            ? { ...bookmark, memo: editingMemo.memo }
            : bookmark
        )
      );

      setEditingMemo(null);
      showToast('메모가 저장되었습니다.', 'success');
    } catch (error) {
      console.error('메모 저장 실패:', error);
      showToast('메모 저장에 실패헀습니다.', 'error');
    }
  };

  // 메모 취소 함수
  const cancelEditingMemo = () => {
    setEditingMemo(null);
  };

  // 메모 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // dropdown이 열려있고, 클릭한 요소가 dropdown 내부가 아닌 경우에만 닫기
      if (openImportanceDropdown !== null) {
        // 클릭된 요소가 dropdown 내부인지 확인
        const dropdownElement = document.querySelector(
          `[data-dropdown-id="${openImportanceDropdown}"]`
        );
        if (dropdownElement && !dropdownElement.contains(e.target as Node)) {
          setOpenImportanceDropdown(null);
        }
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside as unknown as EventListener
    );
    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside as unknown as EventListener
      );
    };
  }, [openImportanceDropdown]);

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // 오늘
      return date.toLocaleTimeString('ko-kr', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays < 7) {
      // 일주일 이내
      return `${diffDays}일 전`;
    } else {
      // 일주일 이상
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={toggleSelectionMode}
            className={`px-3 py-1 text-sm ${selectionMode ? 'bg-red-500 hover:bg-red-600' : ''}`}
          >
            {selectionMode ? '선택 취소' : '선택 모드'}
          </Button>

          {selectionMode && (
            <>
              <Button onClick={toggleSelectAll} className="px-3 py-1 text-sm">
                {selectedBookmarks.size === filteredBookmarks.length
                  ? '전체 해제'
                  : '전체 선택'}
              </Button>

              <Button
                onClick={deleteSelectedBookmarks}
                className="bg-red-500 px-3 py-1 text-sm hover:bg-red-600"
                disabled={selectedBookmarks.size === 0 || isDeleting}
              >
                {isDeleting ? '삭제 중...' : `삭제 (${selectedBookmarks.size})`}
              </Button>
            </>
          )}

          {!selectionMode && (
            <div className="flex flex-wrap items-center gap-2">
              {/* 주 필터 드롭다운 */}
              <select
                value={filterType}
                onChange={(e) =>
                  handleFilterTypeChange(e.target.value as FilterType)
                }
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="latest">최신순</option>
                <option value="category">카테고리</option>
                <option value="importance">중요도</option>
              </select>

              {/* 카테고리 하위 필터 (카테고리 필터 선택 시에만 표시) */}
              {filterType === 'category' && (
                <select
                  value={categoryFilter || ''}
                  onChange={(e) => setCategoryFilter(e.target.value || null)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="">모든 카테고리</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryName(category)}
                    </option>
                  ))}
                </select>
              )}

              {/* 중요도 하위 필터 (중요도 필터 선택 시에만 표시) */}
              {filterType === 'importance' && (
                <select
                  value={
                    importanceFilter !== null ? importanceFilter.toString() : ''
                  }
                  onChange={(e) =>
                    setImportanceFilter(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="">모든 중요도</option>
                  {IMPORTANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      {/* 북마크 목록 */}
      {filteredBookmarks.length > 0 ? (
        filteredBookmarks.map((post, index) => (
          <div
            key={`bookmark-${post.id}-${index}`}
            className={`relative block rounded-lg border p-4 ${
              selectionMode && selectedBookmarks.has(post.id)
                ? 'border-gold-start bg-gold-start/5'
                : 'hover:border-gold-start hover:bg-gray-50'
            }`}
          >
            {/* 중요도 표시 */}
            {post.importance > 0 && (
              <div
                className="absolute left-0 top-0 h-full w-1.5 rounded-l-lg"
                style={{
                  backgroundColor: IMPORTANCE_OPTIONS[post.importance].color,
                }}
              />
            )}

            <div className="relative">
              {/* 선택 체크박스 추가 */}
              {selectionMode && (
                <div className="mb-2 flex justify-end">
                  <button
                    onClick={(e: MouseEvent<HTMLButtonElement>) =>
                      toggleBookmarkSelection(post.id, e)
                    }
                    className="rounded p-1 hover:bg-gray-100"
                  >
                    {selectedBookmarks.has(post.id) ? (
                      <CheckSquare className="h-5 w-5 text-gold-start" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              )}

              {/* 북마크 메인 컨텐츠 */}
              <Link
                href={selectionMode ? '#' : `/community/post/${post.id}`}
                className="block"
                onClick={selectionMode ? (e) => e.preventDefault() : undefined}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                      {getCategoryName(post.category)}
                    </span>

                    {post.tags && post.tags.length > 0 && (
                      <div className="hidden flex-wrap gap-1 sm:flex">
                        {post.tags.map((tag, idx) => (
                          <span
                            key={`tag-${post.id}-${idx}`}
                            className="rounded bg-gray-100 px-1.5 text-xs text-gray-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 북마크 아이콘 및 중요도 표시 */}
                  <div className="flex items-center gap-2">
                    {!selectionMode && (
                      <div className="relative">
                        <button
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
                          onClick={(e) => toggleImportanceDropdown(post.id, e)}
                        >
                          <Star
                            className={`h-5 w-5 ${post.importance > 0 ? 'fill-yellow-400 text-yellow-500' : 'text-gray-300'}`}
                          />
                        </button>

                        {/* 중요도 선택 드롭다운 - hover 대신 상태로 관리 */}
                        {openImportanceDropdown === post.id && (
                          <div
                            className="absolute right-0 top-full z-20 w-40 flex-col rounded-lg border bg-white p-2 shadow-lg"
                            data-dropdown-id={post.id}
                          >
                            {IMPORTANCE_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                className="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100"
                                onClick={(e) =>
                                  handleImportanceChange(
                                    post.id,
                                    option.value,
                                    e
                                  )
                                }
                              >
                                <div
                                  className={`h-3 w-3 rounded-full ${option.color}`}
                                ></div>
                                <span>{option.label} 중요도</span>
                                {post.importance === option.value && (
                                  <CheckSquare className="ml-auto h-4 w-4 text-green-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                </div>

                <h3 className="mb-2 text-lg font-medium">{post.title}</h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
                      {post.author_avatar ? (
                        <Image
                          src={post.author_avatar}
                          alt={post.author_name || ''}
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                          {post.author_name
                            ? post.author_name.charAt(0).toUpperCase()
                            : '?'}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      {post.author_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{post.comments_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{post.likes_count}</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* 메모 영역 - 기존 Link 태그 다음에 추가 */}
              <div className="mt-3 border-t pt-2">
                {editingMemo && editingMemo.postId === post.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      ref={memoInputRef}
                      value={editingMemo.memo}
                      onChange={(e) =>
                        setEditingMemo({ ...editingMemo, memo: e.target.value })
                      }
                      className="h-20 w-full resize-none rounded-md border border-gray-300 p-2 text-sm focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
                      placeholder="북마크에 메모를 남겨보세요..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEditingMemo}
                        className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                      >
                        취소
                      </button>
                      <button
                        onClick={saveMemo}
                        className="rounded bg-gold-start px-2 py-1 text-xs text-white hover:bg-gold-end"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-start justify-between">
                    {post.memo ? (
                      <p className="whitespace-pre-wrap text-sm text-gray-600">
                        {post.memo}
                      </p>
                    ) : (
                      <p className="text-sm italic text-gray-400">메모 없음</p>
                    )}
                    {!selectionMode && (
                      <button
                        onClick={(e: MouseEvent<HTMLButtonElement>) =>
                          startEditingMemo(post, e)
                        }
                        className="ml-2 hidden rounded p-1 text-gray-500 hover:bg-gray-100 group-hover:block"
                        title="메모 편집"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
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
