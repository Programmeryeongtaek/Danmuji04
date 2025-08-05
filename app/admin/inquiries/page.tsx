'use client';

import { useToast } from '@/components/common/Toast/Context';
import {
  Inquiry,
  InquiryFilters,
  useInquiries,
  useMarkAsRead,
  useRespondToInquiry,
} from '@/hooks/api/useInquiry';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import {
  ArrowLeft,
  Check,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

export default function InquiriesManagePage() {
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [responseText, setResponseText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'unread' | 'read' | 'answered'
  >('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);

  const router = useRouter();
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  // 필터 객체 생성
  const filters: InquiryFilters = {
    status: statusFilter,
    searchQuery: searchQuery.trim() || undefined,
  };

  const {
    data: inquiries = [],
    isLoading: inquiriesLoading,
    error: inquiriesError,
    refetch: refetchInquiries,
    isFetching: isRefreshing,
  } = useInquiries(filters);

  const respondMutation = useRespondToInquiry();
  const markAsReadMutation = useMarkAsRead();

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdminAuth = async () => {
      if (!user) {
        router.push('/');
        return;
      }

      const supabase = createClient();

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'admin') {
          router.push('/');
          showToast('관리자 권한이 필요합니다.', 'error');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('관리자 권한 확인 실패:', error);
        router.push('/');
        showToast('권한 확인에 실패했습니다.', 'error');
      } finally {
        setAdminCheckLoading(false);
      }
    };

    checkAdminAuth();
  }, [user, router, showToast]);

  // 문의 목록 에러 처리
  useEffect(() => {
    if (inquiriesError) {
      console.error('문의 목록 로드 실패:', inquiriesError);
      showToast('문의 목록을 불러오는데 실패했습니다.', 'error');
    }
  }, [inquiriesError, showToast]);

  // 읽음 상태 변경
  const handleMarkAsRead = (inquiryId: number) => {
    markAsReadMutation.mutate({ inquiryId });
  };

  // 응답 전송
  const handleSendResponse = (e: FormEvent) => {
    e.preventDefault();

    if (!selectedInquiry) return;
    if (!responseText.trim()) {
      showToast('응답 내용을 입력해주세요.', 'error');
      return;
    }

    respondMutation.mutate(
      {
        inquiryId: selectedInquiry.id,
        response: responseText,
      },
      {
        onSuccess: (updatedInquiry) => {
          setResponseText('');
          // 선택된 문의도 업데이트
          setSelectedInquiry(updatedInquiry);
        },
      }
    );
  };

  // 문의 선택
  const handleSelectInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);

    // 읽지 않은 문의인 경우 자동으로 읽음 상태로 변경
    if (inquiry.status === 'unread') {
      handleMarkAsRead(inquiry.id);
    }
  };

  const getStatusCounts = () => {
    return {
      all: inquiries.length,
      unread: inquiries.filter((i) => i.status === 'unread').length,
      read: inquiries.filter((i) => i.status === 'read').length,
      answered: inquiries.filter((i) => i.status === 'answered').length,
    };
  };

  const statusCounts = getStatusCounts();
  const isLoading = adminCheckLoading || inquiriesLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto py-12 mobile:mb-10 mobile:px-4 tablet:mb-0 tablet:px-6">
      <div className="flex justify-between mobile:mb-4 tablet:mb-6 laptop:mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">문의 응답</h1>
          {/* 실시간 새로고침 버튼 추가 */}
          <button
            onClick={() => refetchInquiries()}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg border p-2 transition hover:bg-gray-50 disabled:opacity-50"
            title="문의 목록 새로고침"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:border-gold-start hover:bg-gold-start hover:text-black"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 문의 목록 */}
        <div className="lg:col-span-1">
          {/* 상태 필터 추가 */}
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
                className="flex-1 rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none"
              >
                <option value="all">전체 ({statusCounts.all})</option>
                <option value="unread">
                  읽지 않음 ({statusCounts.unread})
                </option>
                <option value="read">읽음 ({statusCounts.read})</option>
                <option value="answered">
                  답변 완료 ({statusCounts.answered})
                </option>
              </select>
            </div>

            {/* 검색창 */}
            <div className="flex items-center rounded-lg border bg-white p-2 shadow-sm">
              <Search className="mx-2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 이메일, 제목, 내용 검색..."
                className="flex-1 border-none bg-transparent p-1 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b p-3 font-medium">
              <span>문의 목록 ({inquiries.length})</span>
              {isRefreshing && (
                <RefreshCw className="h-4 w-4 animate-spin text-gold-start" />
              )}
            </div>

            {/* TanStack Query 데이터 사용 */}
            {inquiries.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {inquiriesLoading
                  ? '로딩 중...'
                  : searchQuery.trim() || statusFilter !== 'all'
                    ? '검색 결과가 없습니다.'
                    : '문의 내역이 없습니다.'}
              </div>
            ) : (
              <div className="max-h-[70vh] divide-y overflow-auto">
                {inquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className={`cursor-pointer p-4 transition hover:border-gold-start hover:bg-light ${
                      selectedInquiry?.id === inquiry.id ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => handleSelectInquiry(inquiry)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{inquiry.name}</div>
                      <div
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          inquiry.status === 'unread'
                            ? 'bg-red-100 text-red-800'
                            : inquiry.status === 'read'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {inquiry.status === 'unread'
                          ? '읽지 않음'
                          : inquiry.status === 'read'
                            ? '읽음'
                            : '답변 완료'}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {inquiry.subject}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {new Date(inquiry.created_at).toLocaleDateString()}
                      </span>
                      <span>{inquiry.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 문의 상세 및 응답 */}
        <div className="lg:col-span-2">
          {selectedInquiry ? (
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="border-b p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-medium">
                    {selectedInquiry.subject}
                  </h2>
                  <div className="flex gap-2">
                    {selectedInquiry.status === 'unread' && (
                      <button
                        onClick={() => handleMarkAsRead(selectedInquiry.id)}
                        disabled={markAsReadMutation.isPending}
                        className="flex items-center gap-1 rounded-lg border border-blue-500 px-3 py-1 text-sm text-blue-500 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {markAsReadMutation.isPending
                          ? '처리중...'
                          : '읽음표시'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedInquiry.name}</div>
                    <div className="text-sm text-gray-600">
                      {selectedInquiry.email}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(selectedInquiry.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="border-b p-4">
                <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4">
                  {selectedInquiry.message}
                </div>
              </div>

              {selectedInquiry.response && (
                <div className="border-b p-4">
                  <div className="mb-2 font-medium">응답 내용:</div>
                  <div className="whitespace-pre-wrap rounded-lg bg-blue-50 p-4 text-gray-800">
                    {selectedInquiry.response}
                  </div>
                  <div className="mt-2 text-right text-xs text-gray-500">
                    응답일:{' '}
                    {new Date(selectedInquiry.updated_at).toLocaleString()}
                  </div>
                </div>
              )}

              {/* TanStack Query 뮤테이션으로 응답 폼 개선 */}
              {selectedInquiry.status !== 'answered' && (
                <form onSubmit={handleSendResponse} className="p-4">
                  <div className="mb-2 font-medium">응답 작성:</div>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="문의에 대한 응답을 작성해주세요..."
                    className="h-40 w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={respondMutation.isPending}
                      className="flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l disabled:opacity-50"
                    >
                      {respondMutation.isPending ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          전송 중...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          응답 전송
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border bg-white p-8 shadow-sm">
              <div className="text-center text-gray-500">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p>왼쪽에서 문의를 선택하여 상세 내용을 확인하세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 에러 상태 표시 */}
      {inquiriesError && (
        <div className="mt-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                문의 목록을 불러오는 중 오류가 발생했습니다.
                <button
                  onClick={() => refetchInquiries()}
                  className="ml-2 font-medium underline hover:no-underline"
                >
                  다시 시도
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
