'use client';

import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import Link from 'next/link';
import { Book, Calendar, Filter, Plus, Search, Users } from 'lucide-react';
import { useMyStudies } from '@/hooks/api/useStudyManagement';

// 탭 타입 정의
type StudyTab = 'all' | 'participating' | 'created' | 'pending' | 'completed';

export default function MyStudiesPageContent() {
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

  const { data: studies = [], isLoading, error } = useMyStudies();

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

  // 로그인 체크
  useEffect(() => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
    }
  }, [user, router, showToast]);

  // 필터링된 스터디 - useMemo로 최적화
  const filteredStudies = useMemo(() => {
    let result = studies;

    // 탭별 필터링
    switch (activeTab) {
      case 'participating':
        result = result.filter(
          (study) =>
            study.role === 'participant' &&
            study.participant_status === 'approved'
        );
        break;
      case 'created':
        result = result.filter((study) => study.role === 'owner');
        break;
      case 'pending':
        result = result.filter(
          (study) => study.participant_status === 'pending'
        );
        break;
      case 'completed':
        result = result.filter((study) => study.status === 'completed');
        break;
      default:
        break;
    }

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (study) =>
          study.title.toLowerCase().includes(query) ||
          study.description.toLowerCase().includes(query) ||
          study.category.toLowerCase().includes(query)
      );
    }

    // 추가 필터링
    if (filters.category !== 'all') {
      result = result.filter((study) => study.category === filters.category);
    }

    if (filters.status !== 'all') {
      result = result.filter((study) => study.status === filters.status);
    }

    return result;
  }, [studies, activeTab, searchQuery, filters]);

  // 탭별 카운드 - useMemo로 최적화
  const tabCounts = useMemo(
    () => ({
      all: studies.length,
      participating: studies.filter(
        (s) => s.role === 'participant' && s.participant_status === 'approved'
      ).length,
      created: studies.filter((s) => s.role === 'owner').length,
      pending: studies.filter((s) => s.participant_status === 'pending').length,
      completed: studies.filter((s) => s.status === 'completed').length,
    }),
    [studies]
  );

  const handleTabChange = (tab: StudyTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    if (tab !== 'all') {
      params.set('type', tab);
    } else {
      params.delete('type');
    }
    router.push(`/my/studies?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      recruiting: { color: 'bg-green-100 text-green-800', text: '모집중' },
      in_progress: { color: 'bg-blue-100 text-blue-800', text: '진행중' },
      completed: { color: 'bg-gray-100 text-gray-800', text: '완료' },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  const getParticipantStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-amber-100 text-amber-800', text: '승인 대기' },
      approved: { color: 'bg-green-100 text-green-800', text: '참여 중' },
      rejected: { color: 'bg-red-100 text-red-800', text: '거부됨' },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
        <span className="ml-2 text-gray-600">스터디 정보를 불러오는 중...</span>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600">
          스터디 정보를 불러오는데 실패했습니다.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-gold-start hover:underline"
        >
          재시도
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold">나의 스터디</h1>
          <p className="text-gray-600">
            참여 중이거나 개설한 스터디를 관리하세요.
          </p>
        </div>
        <Link
          href="/study/create"
          className="flex items-center rounded-lg bg-gold-start px-4 py-2 text-white hover:bg-gold-end"
        >
          <Plus className="mr-2 h-4 w-4" />
          스터디 개설
        </Link>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6 flex flex-wrap gap-2 border-b">
        {[
          { key: 'all', label: '전체' },
          { key: 'participating', label: '참여 중' },
          { key: 'created', label: '개설한 스터디' },
          { key: 'pending', label: '승인 대기' },
          { key: 'completed', label: '완료' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key as StudyTab)}
            className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === key
                ? 'border-gold-start text-gold-start'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label} ({tabCounts[key as keyof typeof tabCounts]})
          </button>
        ))}
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="스터디 제목, 설명, 카테고리로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-gold-start/20"
            />
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          <Filter className="mr-2 h-4 w-4" />
          필터
        </button>
      </div>

      {/* 필터 패널 */}
      {showFilters && (
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">카테고리</label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-gold-start/20"
              >
                <option value="all">전체</option>
                <option value="독서">독서</option>
                <option value="토론">토론</option>
                <option value="프로젝트">프로젝트</option>
                <option value="스터디">스터디</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">상태</label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-gold-start/20"
              >
                <option value="all">전체</option>
                <option value="recruiting">모집중</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setFilters({ category: 'all', status: 'all' })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              필터 초기화
            </button>
          </div>
        </div>
      )}

      {/* 스터디 목록 */}
      <div className="space-y-4">
        {filteredStudies.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h3 className="mb-2 text-lg font-medium text-gray-600">
              {activeTab === 'all'
                ? '참여 중인 스터디가 없습니다'
                : activeTab === 'participating'
                  ? '참여 중인 스터디가 없습니다'
                  : activeTab === 'created'
                    ? '개설한 스터디가 없습니다'
                    : activeTab === 'pending'
                      ? '승인 대기 중인 스터디가 없습니다'
                      : '완료된 스터디가 없습니다'}
            </h3>
            <p className="mb-4 text-gray-500">
              새로운 스터디에 참여하거나 직접 개설해보세요.
            </p>
            <Link
              href="/study"
              className="inline-flex items-center rounded-lg bg-gold-start px-4 py-2 text-white hover:bg-gold-end"
            >
              스터디 둘러보기
            </Link>
          </div>
        ) : (
          filteredStudies.map((study) => (
            <div
              key={study.id}
              className="rounded-lg border bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{study.title}</h3>
                    {getStatusBadge(study.status)}
                    {study.role === 'owner' && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                        방장
                      </span>
                    )}
                    {study.role === 'participant' &&
                      getParticipantStatusBadge(study.participant_status)}
                  </div>
                  <p className="mb-3 text-sm text-gray-600">
                    {study.description}
                  </p>

                  {/* 연결된 도서 정보 */}
                  {study.book_title && (
                    <div className="mb-3 flex items-center text-sm text-blue-600">
                      <Book className="mr-1 h-4 w-4" />
                      <span>{study.book_title}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />
                      <span>
                        {study.approved_participants}/{study.max_participants}명
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      <span>
                        {formatDate(study.start_date)} ~{' '}
                        {formatDate(study.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2 h-2 w-2 rounded-full bg-gray-400"></span>
                      <span>{study.category}</span>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex flex-col gap-2">
                  <Link
                    href={`/study/${study.id}`}
                    className="rounded bg-gold-start px-4 py-2 text-center text-sm text-white hover:bg-gold-end"
                  >
                    상세보기
                  </Link>

                  {study.role === 'owner' && (
                    <Link
                      href={`/study/${study.id}/manage`}
                      className="rounded border border-gray-300 px-4 py-2 text-center text-sm hover:bg-gray-50"
                    >
                      관리
                    </Link>
                  )}
                </div>
              </div>

              {/* 최근 활동 */}
              {study.last_active_at && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">
                    최근 활동: {formatDate(study.last_active_at)}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 페이지네이션 (필요시 추가) */}
      {filteredStudies.length > 0 && (
        <div className="mt-8 flex justify-center">
          <p className="text-sm text-gray-500">
            총 {filteredStudies.length}개의 스터디
          </p>
        </div>
      )}
    </div>
  );
}
