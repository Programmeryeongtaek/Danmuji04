'use client';

import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import {
  Book,
  Calendar,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';

// 스터디 타입 정의
interface Study {
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
  location: string;
  is_online: boolean;
  status: 'recruiting' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  book_id?: string | null;
  book_title?: string | null;
  role: 'owner' | 'participant';
  participant_status: 'pending' | 'approved' | 'rejected';
  last_active_at?: string | null;
}

// 탭 타입 정의
type StudyTab = 'all' | 'participating' | 'created' | 'pending' | 'completed';

export default function MyStudiesPageContent() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [filteredStudies, setFilteredStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StudyTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  // URL에서 초기 탭 설정
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'created') {
      setActiveTab('created');
    } else if (type === 'pending') {
      setActiveTab('pending');
    } else if (type === 'completed') {
      setActiveTab('completed');
    } else if (type === 'participating') {
      setActiveTab('participating');
    }
  }, [searchParams]);

  // 스터디 데이터 로드
  useEffect(() => {
    const fetchStudies = async () => {
      if (!user) {
        showToast('로그인이 필요합니다.', 'error');
        router.push('/?login=true');
        return;
      }

      setIsLoading(true);
      try {
        const supabase = createClient();

        // 사용자가 참여 중인 스터디 ID와 역할 조회
        const { data: participantData, error: participantError } =
          await supabase
            .from('study_participants')
            .select('study_id, role, status, last_active_at')
            .eq('user_id', user.id);

        if (participantError) throw participantError;

        if (!participantData || participantData.length === 0) {
          setStudies([]);
          setFilteredStudies([]);
          setIsLoading(false);
          return;
        }

        // 참여 중인 스터디 ID 목록
        const studyIds = participantData.map((p) => p.study_id);

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

        if (!studiesData) {
          setStudies([]);
          setFilteredStudies([]);
          setIsLoading(false);
          return;
        }

        // 스터디와 참여 정보 병합
        const enrichedStudies: Study[] = studiesData.map((study) => {
          const participantInfo = participantData.find(
            (p) => p.study_id === study.id
          );
          return {
            ...study,
            role: participantInfo?.role as 'owner' | 'participant',
            participant_status: participantInfo?.status as
              | 'pending'
              | 'approved'
              | 'rejected',
            last_active_at: participantInfo?.last_active_at || null,
            book_title: study.books?.title || null,
          };
        });

        setStudies(enrichedStudies);
        setFilteredStudies(enrichedStudies);
      } catch (error) {
        console.error('스터디 로드 실패:', error);
        showToast('스터디 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudies();
  }, [user, router, showToast]);

  // 필터링 적용
  useEffect(() => {
    if (studies.length === 0) return;

    let result = [...studies];

    // 탭 필터
    if (activeTab === 'participating') {
      result = result.filter(
        (study) =>
          study.participant_status === 'approved' &&
          study.role === 'participant'
      );
    } else if (activeTab === 'created') {
      result = result.filter((study) => study.role === 'owner');
    } else if (activeTab === 'pending') {
      result = result.filter((study) => study.participant_status === 'pending');
    } else if (activeTab === 'completed') {
      result = result.filter((study) => study.status === 'completed');
    }

    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (study) =>
          study.title.toLowerCase().includes(query) ||
          study.description.toLowerCase().includes(query) ||
          study.category.toLowerCase().includes(query) ||
          (study.book_title && study.book_title.toLowerCase().includes(query))
      );
    }

    // 추가 필터
    if (filters.category !== 'all') {
      result = result.filter((study) => study.category === filters.category);
    }

    if (filters.status !== 'all') {
      result = result.filter((study) => study.status === filters.status);
    }

    setFilteredStudies(result);
  }, [studies, activeTab, searchQuery, filters]);

  // 탭 변경 핸들러
  const handleTabChange = (tab: StudyTab) => {
    setActiveTab(tab);

    // URL 업데이트
    const params = new URLSearchParams(searchParams.toString());
    if (tab !== 'all') {
      params.set('type', tab);
    } else {
      params.delete('type');
    }

    router.push(`/my/studies?${params.toString()}`);
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 검색 로직은 useEffect에서 처리
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

  // 스터디 카테고리 목록
  const categories = [
    { id: 'all', label: '전체' },
    { id: 'book', label: '도서' },
    { id: '인문학', label: '인문학' },
    { id: '철학', label: '철학' },
    { id: '심리학', label: '심리학' },
    { id: '경제학', label: '경제학' },
    { id: '자기계발', label: '자기계발' },
    { id: '리더십', label: '리더십' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 스터디</h1>
        <Link
          href="/study/create"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          스터디 개설하기
        </Link>
      </div>

      {/* 스터디 현황 요약 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">참여 중인 스터디</p>
              <p className="text-xl font-bold">
                {
                  studies.filter((s) => s.participant_status === 'approved')
                    .length
                }
                개
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">내가 개설한 스터디</p>
              <p className="text-xl font-bold">
                {studies.filter((s) => s.role === 'owner').length}개
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Book className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">도서 스터디</p>
              <p className="text-xl font-bold">
                {
                  studies.filter(
                    (s) => s.book_id && s.participant_status === 'approved'
                  ).length
                }
                개
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">진행 중인 스터디</p>
              <p className="text-xl font-bold">
                {
                  studies.filter(
                    (s) =>
                      s.status === 'in_progress' &&
                      s.participant_status === 'approved'
                  ).length
                }
                개
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              필터
            </button>
            {showFilters && (
              <div className="flex items-center gap-2">
                <select
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange('category', e.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="all">모든 상태</option>
                  <option value="recruiting">모집 중</option>
                  <option value="in_progress">진행 중</option>
                  <option value="completed">완료</option>
                </select>
                <button
                  onClick={() => {
                    setFilters({ category: 'all', status: 'all' });
                    setShowFilters(false);
                  }}
                  className="rounded-full bg-gray-200 p-1 hover:bg-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSearch}
            className="flex w-full max-w-md items-center"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="스터디 검색..."
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

        {/* 탭 메뉴 */}
        <div className="border-b pb-4">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => handleTabChange('all')}
              className={`mr-4 border-b-2 pb-2 font-medium ${
                activeTab === 'all'
                  ? 'border-gold-start text-gold-start'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleTabChange('participating')}
              className={`mr-4 border-b-2 pb-2 font-medium ${
                activeTab === 'participating'
                  ? 'border-gold-start text-gold-start'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              참여 중
            </button>
            <button
              onClick={() => handleTabChange('created')}
              className={`mr-4 border-b-2 pb-2 font-medium ${
                activeTab === 'created'
                  ? 'border-gold-start text-gold-start'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              내가 개설한 스터디
            </button>
            <button
              onClick={() => handleTabChange('pending')}
              className={`mr-4 border-b-2 pb-2 font-medium ${
                activeTab === 'pending'
                  ? 'border-gold-start text-gold-start'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              승인 대기 중
            </button>
            <button
              onClick={() => handleTabChange('completed')}
              className={`mr-4 border-b-2 pb-2 font-medium ${
                activeTab === 'completed'
                  ? 'border-gold-start text-gold-start'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              완료된 스터디
            </button>
          </div>
        </div>
      </div>

      {/* 스터디 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
        </div>
      ) : filteredStudies.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudies.map((study) => (
            <div
              key={study.id}
              className="flex flex-col rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
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
                <span className="text-sm text-gray-500">{study.category}</span>
              </div>

              <h2 className="mb-2 text-lg font-semibold">{study.title}</h2>
              <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                {study.description}
              </p>

              {study.book_title && (
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <Book className="h-4 w-4 text-amber-500" />
                  <span className="text-gray-700">{study.book_title}</span>
                </div>
              )}

              <div className="mt-auto space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <Users className="mr-1 h-4 w-4" />
                    <span>
                      {study.approved_participants}/{study.max_participants}명
                    </span>
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        study.role === 'owner'
                          ? 'bg-amber-100 text-amber-800'
                          : study.participant_status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {study.role === 'owner'
                        ? '방장'
                        : study.participant_status === 'approved'
                          ? '참여자'
                          : '승인대기'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="mr-1 h-4 w-4" />
                  <span>
                    {formatDate(study.start_date)} ~{' '}
                    {formatDate(study.end_date)}
                  </span>
                </div>
              </div>

              <Link
                href={`/study/${study.id}`}
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
            <Users className="h-16 w-16 text-gray-300" />
          </div>
          <h3 className="mb-2 text-lg font-medium">스터디가 없습니다</h3>
          <p className="mb-6 text-gray-500">
            {activeTab === 'all'
              ? '참여 중인 스터디가 없습니다. 새로운 스터디에 참여하거나 직접 개설해보세요.'
              : activeTab === 'participating'
                ? '참여 중인 스터디가 없습니다. 새로운 스터디에 참여해보세요.'
                : activeTab === 'created'
                  ? '개설한 스터디가 없습니다. 새로운 스터디를 만들어보세요.'
                  : activeTab === 'pending'
                    ? '승인 대기 중인 스터디가 없습니다.'
                    : '완료된 스터디가 없습니다.'}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/study"
              className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              스터디 둘러보기
            </Link>
            <Link
              href="/study/create"
              className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white hover:opacity-90"
            >
              스터디 개설하기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
