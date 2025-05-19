'use client';

import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Check, Search, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

interface Inquiry {
  id: number;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'answered';
  created_at: string;
  updated_at: string;
  response?: string;
}

export default function InquiriesManagePage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const checkAdminAndLoadInquiries = async () => {
      const supabase = createClient();

      // 1. 먼저 관리자 권한 확인
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

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

      // 2. 문의 목록 로드
      try {
        const { data, error } = await supabase
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInquiries(data || []);
        setFilteredInquiries(data || []);
      } catch (error) {
        console.error('Error loading inquiries:', error);
        showToast('문의 목록을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAndLoadInquiries();
  }, [router, showToast]);

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInquiries(inquiries);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = inquiries.filter(
      (inquiry) =>
        inquiry.name.toLowerCase().includes(query) ||
        inquiry.email.toLowerCase().includes(query) ||
        inquiry.subject.toLowerCase().includes(query) ||
        inquiry.message.toLowerCase().includes(query)
    );

    setFilteredInquiries(filtered);
  }, [searchQuery, inquiries]);

  const handleMarkAsRead = async (inquiryId: number) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'read', updated_at: new Date().toISOString() })
        .eq('id', inquiryId);

      if (error) throw error;

      // UI 업데이트
      setInquiries((prev) =>
        prev.map((inq) =>
          inq.id === inquiryId
            ? { ...inq, status: 'read', updated_at: new Date().toISOString() }
            : inq
        )
      );
      setFilteredInquiries((prev) =>
        prev.map((inq) =>
          inq.id === inquiryId
            ? { ...inq, status: 'read', updated_at: new Date().toISOString() }
            : inq
        )
      );

      if (selectedInquiry?.id === inquiryId) {
        setSelectedInquiry((prev) =>
          prev
            ? { ...prev, status: 'read', updated_at: new Date().toISOString() }
            : null
        );
      }

      showToast('문의가 읽음 상태로 변경되었습니다.', 'success');
    } catch (error) {
      console.error('문의 상태 업데이트 실패:', error);
      showToast('문의 상태 업데이트에 실패했습니다.', 'error');
    }
  };

  const handleSendResponse = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedInquiry) return;
    if (!responseText.trim()) {
      showToast('응답 내용을 입력해주세요.', 'error');
      return;
    }

    setIsReplying(true);

    try {
      const supabase = createClient();

      // 1. 응답 내용 저장
      const { error } = await supabase
        .from('contact_messages')
        .update({
          status: 'answered',
          response: responseText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedInquiry.id);

      if (error) throw error;

      // 2. 이메일 발송 (서버 함수 호출)
      // 실제 환경에서는 서버 함수나 API를 호출하여 이메일 발송
      // 여기서는 UI 업데이트만 진행

      // UI 업데이트
      const updatedInquiry: Inquiry = {
        ...selectedInquiry,
        status: 'answered' as const,
        response: responseText,
        updated_at: new Date().toISOString(),
      };

      // setInquiries와 setFilteredInquiries 부분 수정
      setInquiries((prev) =>
        prev.map((inq) =>
          inq.id === selectedInquiry.id ? updatedInquiry : inq
        )
      );

      setFilteredInquiries((prev) =>
        prev.map((inq) =>
          inq.id === selectedInquiry.id ? updatedInquiry : inq
        )
      );
      setSelectedInquiry(updatedInquiry);

      showToast('응답이 성공적으로 전송되었습니다.', 'success');
      setResponseText('');
    } catch (error) {
      console.error('응답 전송 실패:', error);
      showToast('응답 전송에 실패했습니다.', 'error');
    } finally {
      setIsReplying(false);
    }
  };

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
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">문의 응답 관리</h1>
          <p className="text-gray-600">사용자 문의에 답변합니다</p>
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
          {/* 검색창 */}
          <div className="mb-4 flex items-center rounded-lg border bg-white p-2 shadow-sm">
            <Search className="mx-2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어 입력"
              className="flex-1 border-none bg-transparent p-1 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border bg-white shadow-sm">
            <div className="border-b p-3 font-medium">
              문의 목록 ({filteredInquiries.length})
            </div>

            {filteredInquiries.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                문의 내역이 없습니다
              </div>
            ) : (
              <div className="max-h-[70vh] divide-y overflow-auto">
                {filteredInquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className={`cursor-pointer p-4 transition hover:border-gold-start hover:bg-light ${
                      selectedInquiry?.id === inquiry.id ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => setSelectedInquiry(inquiry)}
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
                        className="rounded-lg border border-blue-500 px-3 py-1 text-sm text-blue-500 hover:bg-blue-50"
                      >
                        <Check className="h-4 w-4" />
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

              {selectedInquiry.status !== 'answered' && (
                <form onSubmit={handleSendResponse} className="p-4">
                  <div className="mb-2 font-medium">응답 작성:</div>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="문의에 대한 응답을 작성해주세요..."
                    className="h-40 w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
                    required
                  ></textarea>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isReplying}
                      className="flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l disabled:opacity-50"
                    >
                      {isReplying ? (
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
                왼쪽에서 문의를 선택하여 상세 내용을 확인하세요
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
