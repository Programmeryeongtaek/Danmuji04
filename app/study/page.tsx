'use client';

import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import { CalendarClock, MessageCircle, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Study {
  id: string;
  title: string;
  description: string;
  category: string;
  owner_id: string;
  owner_name: string;
  max_participants: number;
  current_participants: number;
  start_date: string;
  end_date: string;
  location: string;
  is_online: boolean;
  status: 'recruiting' | 'in_progress' | 'completed';
  created_at: string;
}

const categoryOptions = [
  { id: 'all', label: '전체' },
  { id: 'humanities', label: '인문학' },
  { id: 'philosophy', label: '철학' },
  { id: 'psychology', label: '심리학' },
  { id: 'economics', label: '경제학' },
  { id: 'self-development', label: '자기계발' },
  { id: 'leadership', label: '리더십' },
];

const statusOptions = [
  { id: 'all', label: '전체' },
  { id: 'recruiting', label: '모집중' },
  { id: 'in_progress', label: '진행중' },
  { id: 'completed', label: '완료' },
];

export default function StudyPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAtomValue(userAtom);

  useEffect(() => {
    // URL에서 필터 값 가져오기
    const categoryParam = searchParams.get('category');
    const statusParam = searchParams.get('status');

    if (categoryParam) setSelectedCategory(categoryParam);
    if (statusParam) setSelectedStatus(statusParam);

    fetchStudies(categoryParam || 'all', statusParam || 'all');
  }, [searchParams]);

  const fetchStudies = async (category: string, status: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // 기본 쿼리 시작
      let query = supabase.from('studies').select('*');

      // 카테고리 필터
      if (category !== 'all') {
        query = query.eq('category', category);
      }

      // 상태 필터
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      // 최신순 정렬
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setStudies(data || []);
    } catch (error) {
      console.error('Failed to fetch studies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    updateURL(category, selectedStatus);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    updateURL(selectedCategory, status);
  };

  const updateURL = (category: string, status: string) => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (status !== 'all') params.set('status', status);

    const newPath = `/study${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newPath);
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
      <div className="mb-8 flex flex-col">
        <h1 className="mb-2 text-2xl font-bold">스터디</h1>
        <p className="text-gray-600">
          다양한 주제의 스터디에 참여하거나 자신만의 스터디를 만들어보세요.
        </p>
      </div>

      {/* 필터 및 스터디 생성 버튼 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center rounded-lg border p-1 shadow-sm">
            {categoryOptions.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`rounded-md px-3 py-1 text-sm ${
                  selectedCategory === category.id
                    ? 'bg-gold-start text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-lg border p-1 shadow-sm">
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

        {user && (
          <Link
            href="/study/create"
            className="flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
          >
            <Plus className="mr-1 h-4 w-4" />
            스터디 개설하기
          </Link>
        )}
      </div>

      {/* 스터디 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
        </div>
      ) : studies.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {studies.map((study) => (
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
                <span className="text-sm text-gray-500">{study.category}</span>
              </div>

              <h2 className="mb-1 line-clamp-1 text-lg font-bold">
                {study.title}
              </h2>
              <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                {study.description}
              </p>

              <div className="mt-auto space-y-2 text-sm">
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4 text-gray-400" />
                  <span>
                    {study.current_participants}/{study.max_participants}명 참여
                    중
                  </span>
                </div>
                <div className="flex items-center">
                  <CalendarClock className="mr-2 h-4 w-4 text-gray-400" />
                  <span>
                    {formatDate(study.start_date)} ~{' '}
                    {formatDate(study.end_date)}
                  </span>
                </div>
                <div className="flex items-center">
                  <MessageCircle className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="truncate">
                    {study.is_online ? '온라인' : study.location}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-white py-12 text-center">
          <p className="mb-4 text-gray-500">스터디가 없습니다.</p>
          {user ? (
            <Link
              href="/study/create"
              className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
            >
              스터디 개설하기
            </Link>
          ) : (
            <button
              onClick={() => router.push('/?login=true')}
              className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
            >
              로그인하고 시작하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
