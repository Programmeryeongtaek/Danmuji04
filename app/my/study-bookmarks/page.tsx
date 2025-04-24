'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import {
  Book,
  BookmarkIcon,
  Calendar,
  ExternalLink,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

// 북마크된 스터디 타입 정의
interface BookmarkedStudy {
  id: string;
  study_id: string;
  user_id: string;
  created_at: string;
  notes: string | null;
  importance: number;
  // 스터디 정보
  study: {
    id: string;
    title: string;
    category: string;
    description: string;
    owner_id: string;
    owner_name: string;
    max_participants: number;
    current_participants: number;
    approved_participants: number;
    start_date: string;
    end_date: string;
    status: 'recruiting' | 'in_progress' | 'completed';
    book_id?: string | null;
    book_title?: string | null;
  };
}

export default function StudyBookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedStudy[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkedStudy[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookmarks, setSelectedBookmarks] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showNotesEditor, setShowNotesEditor] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');

  const router = useRouter();
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  // 북마크 데이터 로드
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) {
        showToast('로그인이 필요합니다.', 'error');
        router.push('/?login=true');
        return;
      }

      setIsLoading(true);
      try {
        const supabase = createClient();

        // 북마크 목록 조회
        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from('study_bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bookmarkError) throw bookmarkError;

        if (!bookmarkData || bookmarkData.length === 0) {
          setBookmarks([]);
          setFilteredBookmarks([]);
          setIsLoading(false);
          return;
        }

        // 북마크된 스터디 ID 목록
        const studyIds = bookmarkData.map((b) => b.study_id);

        // 스터디 상세 정보 조회
        const { data: studiesData, error: studiesError } = await supabase
          .from('studies')
          .select(
            `
            *,
            books:book_id (
              id,
              title
            )
          `
          )
          .in('id', studyIds);

        if (studiesError) throw studiesError;

        // 북마크와 스터디 정보 병합
        const enrichedBookmarks: BookmarkedStudy[] = bookmarkData
          .map((bookmark) => {
            const study = studiesData?.find((s) => s.id === bookmark.study_id);
            if (!study) return null;

            return {
              ...bookmark,
              study: {
                ...study,
                book_title: study.books?.title || null,
              },
            };
          })
          .filter(Boolean) as BookmarkedStudy[];

        setBookmarks(enrichedBookmarks);
        setFilteredBookmarks(enrichedBookmarks);
      } catch (error) {
        console.error('북마크 로드 실패:', error);
        showToast('북마크 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [user, router, showToast]);

  // 필터링 적용
  useEffect(() => {
    if (bookmarks.length === 0) return;

    let result = [...bookmarks];

    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (bookmark) =>
          bookmark.study.title.toLowerCase().includes(query) ||
          bookmark.study.description.toLowerCase().includes(query) ||
          bookmark.study.category.toLowerCase().includes(query) ||
          (bookmark.study.book_title &&
            bookmark.study.book_title.toLowerCase().includes(query)) ||
          (bookmark.notes && bookmark.notes.toLowerCase().includes(query))
      );
    }

    // 카테고리 필터
    if (activeCategory !== 'all') {
      result = result.filter(
        (bookmark) => bookmark.study.category === activeCategory
      );
    }

    // 중요도 순으로 정렬
    result.sort((a, b) => (b.importance || 0) - (a.importance || 0));

    setFilteredBookmarks(result);
  }, [bookmarks, searchQuery, activeCategory]);

  // 검색 핸들러
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    // 검색 로직은 useEffect에서 처리
  };

  // 북마크 선택 토글
  const toggleBookmarkSelection = (id: string) => {
    setSelectedBookmarks((prev) =>
      prev.includes(id)
        ? prev.filter((bookmarkId) => bookmarkId !== id)
        : [...prev, id]
    );
  };

  // 선택된 북마크 삭제
  const deleteSelectedBookmarks = async () => {
    if (selectedBookmarks.length === 0) return;

    if (
      !confirm(
        `선택한 ${selectedBookmarks.length}개의 북마크를 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      const supabase = createClient();

      // 선택된 북마크 삭제
      const { error } = await supabase
        .from('study_bookmarks')
        .delete()
        .in('id', selectedBookmarks);

      if (error) throw error;

      // UI 업데이트
      setBookmarks((prev) =>
        prev.filter((bookmark) => !selectedBookmarks.includes(bookmark.id))
      );
      setSelectedBookmarks([]);

      showToast('선택한 북마크가 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('북마크 삭제 실패:', error);
      showToast('북마크 삭제에 실패했습니다.', 'error');
    }
  };

  // 단일 북마크 삭제
  const deleteBookmark = async (id: string) => {
    if (!confirm('이 북마크를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const supabase = createClient();

      // 북마크 삭제
      const { error } = await supabase
        .from('study_bookmarks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // UI 업데이트
      setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));

      showToast('북마크가 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('북마크 삭제 실패:', error);
      showToast('북마크 삭제에 실패했습니다.', 'error');
    }
  };

  // 메모 수정 시작
  const startEditingNotes = (bookmark: BookmarkedStudy) => {
    setShowNotesEditor(bookmark.id);
    setCurrentNotes(bookmark.notes || '');
  };

  // 메모 저장
  const saveNotes = async (bookmarkId: string) => {
    try {
      const supabase = createClient();

      // 메모 업데이트
      const { error } = await supabase
        .from('study_bookmarks')
        .update({ notes: currentNotes })
        .eq('id', bookmarkId);

      if (error) throw error;

      // UI 업데이트
      setBookmarks((prev) =>
        prev.map((bookmark) =>
          bookmark.id === bookmarkId
            ? { ...bookmark, notes: currentNotes }
            : bookmark
        )
      );

      setShowNotesEditor(null);
      showToast('메모가 저장되었습니다.', 'success');
    } catch (error) {
      console.error('메모 저장 실패:', error);
      showToast('메모 저장에 실패했습니다.', 'error');
    }
  };

  // 중요도 변경
  const updateImportance = async (bookmarkId: string, importance: number) => {
    try {
      const supabase = createClient();

      // 중요도 업데이트
      const { error } = await supabase
        .from('study_bookmarks')
        .update({ importance })
        .eq('id', bookmarkId);

      if (error) throw error;

      // UI 업데이트
      setBookmarks((prev) =>
        prev.map((bookmark) =>
          bookmark.id === bookmarkId ? { ...bookmark, importance } : bookmark
        )
      );

      showToast('중요도가 변경되었습니다.', 'success');
    } catch (error) {
      console.error('중요도 변경 실패:', error);
      showToast('중요도 변경에 실패했습니다.', 'error');
    }
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  // 카테고리 목록 구성
  const categories = [
    'all',
    ...new Set(bookmarks.map((b) => b.study.category)),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">스터디 북마크</h1>
        <Link
          href="/study"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white hover:opacity-90"
        >
          <Users className="h-5 w-5" />
          스터디 둘러보기
        </Link>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-x-auto rounded-lg border p-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap rounded-md px-3 py-1 text-sm ${
                    activeCategory === category
                      ? 'bg-gold-start text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category === 'all' ? '전체' : category}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex w-full max-w-md items-center"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="북마크 검색..."
              className="w-full rounded-l-lg border border-r-0 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-r-lg border border-gray-300 bg-gray-50 px-4 py-2 hover:bg-gray-100"
            >
              <Search className="h-5 w-5 text-gray-500" />
            </button>
          </form>
        </div>

        {/* 선택된 항목 표시 및 삭제 버튼 */}
        {selectedBookmarks.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2">
            <span className="text-sm text-gray-700">
              {selectedBookmarks.length}개 항목 선택됨
            </span>
            <button
              onClick={deleteSelectedBookmarks}
              className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4" />
              선택 삭제
            </button>
          </div>
        )}
      </div>

      {/* 북마크 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
        </div>
      ) : filteredBookmarks.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className={`flex flex-col rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
                selectedBookmarks.includes(bookmark.id)
                  ? 'ring-2 ring-gold-start'
                  : ''
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedBookmarks.includes(bookmark.id)}
                    onChange={() => toggleBookmarkSelection(bookmark.id)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      bookmark.study.status === 'recruiting'
                        ? 'bg-green-100 text-green-800'
                        : bookmark.study.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {bookmark.study.status === 'recruiting'
                      ? '모집중'
                      : bookmark.study.status === 'in_progress'
                        ? '진행중'
                        : '완료'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* 중요도 선택 */}
                  <div className="flex">
                    {[1, 2, 3].map((star) => (
                      <button
                        key={star}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          updateImportance(bookmark.id, star);
                        }}
                        className={`text-lg ${
                          (bookmark.importance || 0) >= star
                            ? 'text-amber-500'
                            : 'text-gray-300'
                        }`}
                        aria-label={`중요도 ${star}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteBookmark(bookmark.id);
                    }}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h2 className="mb-2 text-lg font-semibold">
                {bookmark.study.title}
              </h2>

              {bookmark.study.book_title && (
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <Book className="h-4 w-4 text-amber-500" />
                  <span className="text-gray-700">
                    {bookmark.study.book_title}
                  </span>
                </div>
              )}

              {/* 메모 영역 */}
              {showNotesEditor === bookmark.id ? (
                <div className="mb-3 mt-2">
                  <textarea
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                    rows={3}
                    placeholder="이 스터디에 대한 메모를 남겨보세요"
                  ></textarea>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setShowNotesEditor(null)}
                      className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => saveNotes(bookmark.id)}
                      className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="mb-3 mt-2 min-h-[40px] cursor-pointer rounded-lg border border-dashed border-gray-300 p-2 text-sm text-gray-600 hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startEditingNotes(bookmark);
                  }}
                >
                  {bookmark.notes || '클릭하여 메모 추가...'}
                </div>
              )}

              <div className="mt-auto space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Users className="mr-1 h-4 w-4" />
                  <span>
                    {bookmark.study.approved_participants}/
                    {bookmark.study.max_participants}명
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="mr-1 h-4 w-4" />
                  <span>
                    {formatDate(bookmark.study.start_date)} ~{' '}
                    {formatDate(bookmark.study.end_date)}
                  </span>
                </div>
              </div>

              <Link
                href={`/study/${bookmark.study.id}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4" />
                스터디 바로가기
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-8 text-center">
          <div className="mb-4 flex justify-center">
            <BookmarkIcon className="h-16 w-16 text-gray-300" />
          </div>
          <h3 className="mb-2 text-lg font-medium">북마크가 없습니다</h3>
          <p className="mb-6 text-gray-500">
            관심 있는 스터디를 북마크에 추가하고 관리해보세요.
          </p>
          <Link
            href="/study"
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white hover:opacity-90"
          >
            <Users className="mr-2 h-5 w-5" />
            스터디 둘러보기
          </Link>
        </div>
      )}
    </div>
  );
}
