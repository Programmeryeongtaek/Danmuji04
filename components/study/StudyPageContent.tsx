'use client';

import { createClient } from '@/utils/supabase/client';
import { Book, ThumbsUp, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import BookList from './BookList';
import Image from 'next/image';

// 스터디 및 도서 타입 정의
interface Study {
  id: string;
  title: string;
  category: string;
  max_participants: number;
  current_participants: number;
  start_date: string;
  status: 'recruiting' | 'in_progress' | 'completed';
}

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  recommendation_count: number;
  study_count?: number;
}

export default function StudyPageContent() {
  const [activeTab, setActiveTab] = useState<'square' | 'book'>('square');
  const [popularStudies, setPopularStudies] = useState<Study[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studies, setStudies] = useState<Study[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'square' | 'book'>(
    'square'
  );
  const [selectedStatus, setSelectedStatus] = useState('all');

  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const statusParam = searchParams.get('status');

  useEffect(() => {
    if (category === 'square' || category === 'book') {
      setActiveTab(category);
      setSelectedCategory(category);
    }

    if (statusParam) {
      setSelectedStatus(statusParam);
    }

    fetchInitialData();
  }, [category, statusParam]);

  // URL에서 필터 값 가져오기 부분 수정
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const statusParam = searchParams.get('status');

    // 카테고리 파라미터가 없거나 존재하지 않는 경우 기본값 'square' 사용
    const validCategory = categoryParam === 'book' ? 'book' : 'square';

    if (validCategory !== selectedCategory) {
      setSelectedCategory(validCategory);
    }

    if (statusParam) setSelectedStatus(statusParam);

    if (validCategory === 'square') {
      fetchStudies(validCategory, statusParam || 'all');
    } else {
      fetchBooks(); // 도서 카테고리일 경우 책 목록 가져오기
    }
  }, [searchParams, selectedCategory]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // 인기 스터디 가져오기 (참여자 많은 순)
      const { data: studiesData } = await supabase
        .from('studies')
        .select('*')
        .eq('status', 'recruiting')
        .order('current_participants', { ascending: false })
        .limit(4);

      // 추천 도서 가져오기 (추천수 많은 순)
      const { data: booksData } = await supabase
        .from('books')
        .select('*')
        .order('recommendation_count', { ascending: false })
        .limit(4);

      setPopularStudies(studiesData || []);

      // 각 도서에 대한 스터디 개수 조회
      if (booksData && booksData.length > 0) {
        const booksWithStudyCount = await Promise.all(
          booksData.map(async (book) => {
            const { count, error: countError } = await supabase
              .from('studies')
              .select('*', { count: 'exact', head: true })
              .eq('book_id', book.id);

            if (countError) {
              console.error(
                `도서 ${book.id}의 스터디 개수 조회 실패:`,
                countError
              );
              return { ...book, study_count: 0 };
            }

            return { ...book, study_count: count || 0 };
          })
        );
        setRecommendedBooks(booksWithStudyCount);
      } else {
        setRecommendedBooks([]);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 스터디 데이터 가져오기
  const fetchStudies = async (category: string, status: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from('studies').select('*');

      // 카테고리 필터 (book이 아닌 경우)
      if (category === 'square') {
        query = query.neq('category', 'book');
      }

      // 상태 필터
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      // 정렬
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      setStudies(data || []);
    } catch (error) {
      console.error('스터디 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 도서 데이터 가져오기
  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // 기본 도서 정보 가져오기
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('recommendation_count', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setBooks([]);
        setIsLoading(false);
        return;
      }

      // 각 도서에 대한 스터디 개수 조회
      const booksWithStudyCount = await Promise.all(
        data.map(async (book) => {
          // 해당 도서로 만들어진 스터디 개수 조회
          const { count, error: countError } = await supabase
            .from('studies')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', book.id);

          if (countError) {
            console.error(
              `도서 ${book.id}의 스터디 개수 조회 실패:`,
              countError
            );
            return { ...book, study_count: 0 };
          }

          return { ...book, study_count: count || 0 };
        })
      );

      setBooks(booksWithStudyCount);
    } catch (error) {
      console.error('도서 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: 'square' | 'book') => {
    setActiveTab(tab);
    setSelectedCategory(tab);
    router.push(`/study?category=${tab}`);
  };

  // 상태 옵션
  const statusOptions = [
    { id: 'all', label: '전체' },
    { id: 'recruiting', label: '모집중' },
    { id: 'in_progress', label: '진행중' },
    { id: 'completed', label: '완료' },
  ];

  // URL 업데이트
  const updateURL = (category: string, status: string) => {
    const params = new URLSearchParams();
    params.set('category', category);
    if (status !== 'all') params.set('status', status);
    router.push(`/study?${params.toString()}`);
  };

  // 상태 변경 핸들러
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    updateURL(selectedCategory, status);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">단무지 스터디</h1>
        <p className="text-gray-600">함께 배우고 성장하는 모임에 참여하세요</p>
      </div>

      {/* 카테고리 탭 */}
      <div className="mb-8 flex">
        <button
          onClick={() => handleTabChange('square')}
          className={`flex items-center rounded-l-lg border px-6 py-3 ${
            activeTab === 'square'
              ? 'bg-gold-start text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Users className="mr-2 h-5 w-5" />
          광장
        </button>
        <button
          onClick={() => handleTabChange('book')}
          className={`flex items-center rounded-r-lg border border-l-0 px-6 py-3 ${
            activeTab === 'book'
              ? 'bg-gold-start text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Book className="mr-2 h-5 w-5" />
          도서
        </button>
      </div>

      {/* 필터 및 스터디 생성 버튼 */}
      {selectedCategory === 'square' && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 flex items-center rounded-lg border p-1 shadow-sm">
              {statusOptions.map((status) => (
                <button
                  key={status.id}
                  onClick={() => handleStatusChange(status.id)}
                  className={`rounded-md px-3 py-1 text-sm ${
                    selectedStatus === status.id
                      ? 'bg-gold-start text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/study/create"
            className="flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
          >
            <Users className="mr-2 h-4 w-4" />
            스터디 개설하기
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* 카테고리 기반 조건부 렌더링 */}
          {selectedCategory === 'book' ? (
            // 도서 카테고리 표시
            <BookList initialBooks={books} />
          ) : // 홈 페이지이거나 광장 카테고리인 경우
          searchParams.toString() === '' ||
            searchParams.get('category') === null ? (
            // 메인 페이지 컨텐츠 (인기 스터디 + 추천 도서)
            <>
              {/* 인기 스터디 섹션 */}
              <section className="mb-12">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">인기 스터디</h2>
                  <Link
                    href="/study?category=square"
                    className="text-sm text-gold-start hover:underline"
                  >
                    더보기
                  </Link>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {popularStudies.map((study) => (
                    <Link
                      key={study.id}
                      href={`/study/${study.id}`}
                      className="flex flex-col rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md"
                    >
                      <span
                        className={`mb-2 w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                          study.status === 'recruiting'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {study.status === 'recruiting' ? '모집중' : '진행중'}
                      </span>

                      <h3 className="mb-2 line-clamp-2 text-lg font-semibold">
                        {study.title}
                      </h3>

                      <div className="mt-auto space-y-1 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Users className="mr-1 h-4 w-4" />
                          <span>
                            {study.current_participants}/
                            {study.max_participants}명
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <TrendingUp className="mr-1 h-4 w-4" />
                          <span>시작일: {formatDate(study.start_date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* 추천 도서 섹션 */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">추천 도서</h2>
                  <Link
                    href="/study?category=book"
                    className="text-sm text-gold-start hover:underline"
                  >
                    더보기
                  </Link>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {recommendedBooks.map((book) => (
                    <Link
                      key={book.id}
                      href={`/study/book/${book.id}`}
                      className="flex flex-col rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md"
                    >
                      <div className="mb-3 flex justify-center">
                        {book.cover_url ? (
                          <div className="relative h-[200px] w-[140px] overflow-hidden rounded shadow">
                            <Image
                              src={book.cover_url}
                              alt={book.title}
                              fill
                              sizes="140px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-[200px] w-[140px] items-center justify-center rounded bg-gray-200 shadow">
                            <Book className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <h3 className="mb-1 line-clamp-2 text-lg font-semibold">
                        {book.title}
                      </h3>
                      <p className="mb-2 text-sm text-gray-600">
                        {book.author}
                      </p>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center text-gray-600">
                          <ThumbsUp className="mr-1 h-4 w-4" />
                          <span className="text-sm">
                            {book.recommendation_count}명 추천
                          </span>
                        </div>
                        <div className="flex items-center text-blue-600">
                          <Users className="mr-1 h-4 w-4" />
                          <span className="text-sm">
                            {book.study_count !== undefined
                              ? book.study_count
                              : 0}
                            개 스터디
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          ) : (
            // 광장 카테고리 스터디 목록
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {studies.length > 0 ? (
                studies.map((study) => (
                  <Link
                    key={study.id}
                    href={`/study/${study.id}`}
                    className="flex flex-col rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-2 flex justify-between">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          study.status === 'recruiting'
                            ? 'bg-green-100 text-green-800'
                            : study.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {study.status === 'recruiting'
                          ? '모집중'
                          : study.status === 'in_progress'
                            ? '진행중'
                            : '완료'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {study.category}
                      </span>
                    </div>

                    <h2 className="mb-1 line-clamp-1 text-lg font-bold">
                      {study.title}
                    </h2>

                    <div className="mt-auto space-y-2 text-sm">
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4 text-gray-400" />
                        <span>
                          {study.current_participants}/{study.max_participants}
                          명 참여 중
                        </span>
                      </div>
                      <div className="flex items-center">
                        <TrendingUp className="mr-2 h-4 w-4 text-gray-400" />
                        <span>시작일: {formatDate(study.start_date)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center rounded-lg border bg-white py-12 text-center">
                  <p className="mb-4 text-gray-500">스터디가 없습니다.</p>
                  <Link
                    href="/study/create"
                    className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
                  >
                    스터디 개설하기
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
