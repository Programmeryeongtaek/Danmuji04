'use client';

import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Check, ExternalLink, FileImage, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface InstructorApplication {
  id: number;
  user_id: string;
  name: string;
  email: string;
  phone_number: string;
  specialty: string;
  experience: string;
  motivation: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  social_links?: string;
  certificate_url?: string;
}

export default function InstructorApplicationsPage() {
  const [applications, setApplications] = useState<InstructorApplication[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<InstructorApplication | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const checkAdminAndLoadApplications = async () => {
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

      // 2. 관리자 확인 후 신청서 목록 로드
      try {
        const { data, error } = await supabase
          .from('instructor_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setApplications(data || []);
      } catch (error) {
        console.error('Error loading applications:', error);
        showToast('신청서 목록을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAndLoadApplications();
  }, [router, showToast]);

  const handleApprove = async (applicationId: number) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        'approve_instructor_application',
        { application_id: applicationId }
      );

      if (error) throw error;

      if (data) {
        // 성공적으로 승인됨
        setApplications((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, status: 'approved' } : app
          )
        );
        showToast('강사 신청이 승인되었습니다.', 'success');
      } else {
        throw new Error('승인 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      showToast('승인 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleReject = async (applicationId: number) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        'reject_instructor_application',
        { application_id: applicationId }
      );

      if (error) throw error;

      if (data) {
        // 성공적으로 거부됨
        setApplications((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, status: 'rejected' } : app
          )
        );
        showToast('강사 신청이 거부되었습니다.', 'success');
      } else {
        throw new Error('거부 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      showToast('거부 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const openDetailsModal = (application: InstructorApplication) => {
    setSelectedApplication(application);
    setIsDetailsModalOpen(true);
  };

  const openImageModal = (application: InstructorApplication) => {
    setSelectedApplication(application);
    setIsImageModalOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">관리자 권한을 확인하는 중입니다...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto py-12 mobile:mb-10 mobile:px-4 tablet:mb-0 tablet:px-6">
      <div className="flex justify-between mobile:mb-4 tablet:mb-6 laptop:mb-8">
        <h1 className="text-2xl font-bold">강사 신청 관리</h1>
        <Link
          href="/admin"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:border-gold-start hover:bg-gold-start hover:text-black"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>
      <div className="mb-4 overflow-hidden rounded-lg border">
        <div className="gap-4 bg-gray-100 p-4 font-medium text-gray-700 mobile:hidden tablet:block tablet:grid tablet:grid-cols-12">
          <div className="col-span-2">신청자</div>
          <div className="col-span-1">분야</div>
          <div className="col-span-2">경력</div>
          <div className="col-span-2">지원 동기</div>
          <div className="col-span-2">추가 정보</div>
          <div className="col-span-1">상태</div>
          <div className="col-span-2">액션</div>
        </div>

        {applications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            신청 내역이 없습니다.
          </div>
        ) : (
          <div className="divide-y">
            {applications.map((app) => (
              <div
                key={app.id}
                className="grid gap-4 p-4 mobile:grid-cols-3 tablet:grid-cols-12"
              >
                <div className="col-span-2">
                  <div className="font-medium">{app.name}</div>
                  <div className="text-sm text-gray-500">{app.email}</div>
                  <div className="text-sm text-gray-500">
                    {app.phone_number}
                  </div>
                </div>
                <div className="col-span-1 mobile:hidden tablet:block">
                  {app.specialty}
                </div>
                <div className="col-span-2 whitespace-pre-wrap text-sm">
                  {app.experience.length > 100
                    ? `${app.experience.substring(0, 100)}...`
                    : app.experience}
                  <button
                    className="mt-1 text-blue-500 hover:underline"
                    onClick={() => openDetailsModal(app)}
                  >
                    자세히 보기
                  </button>
                </div>
                <div className="col-span-2 whitespace-pre-wrap text-sm mobile:hidden tablet:block">
                  {app.motivation.length > 100
                    ? `${app.motivation.substring(0, 100)}...`
                    : app.motivation}
                </div>
                <div className="col-span-2 mobile:hidden tablet:block">
                  {app.social_links && (
                    <div className="mb-2">
                      <a
                        href={
                          app.social_links.includes('http')
                            ? app.social_links
                            : `https://${app.social_links}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-blue-500 hover:underline"
                      >
                        소셜/포트폴리오
                      </a>
                    </div>
                  )}
                  {app.certificate_url && (
                    <button
                      className="flex items-center text-sm text-blue-500 hover:underline"
                      onClick={() => openImageModal(app)}
                    >
                      자격증 보기
                    </button>
                  )}
                </div>
                <div className="col-span-1">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      app.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : app.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {app.status === 'approved'
                      ? '승인'
                      : app.status === 'rejected'
                        ? '거부'
                        : '대기'}
                  </span>
                </div>
                <div className="col-span-2">
                  {app.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(app.id)}
                        className="flex items-center rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                      >
                        <Check className="mr-1 h-4 w-4" />
                        승인
                      </button>
                      <button
                        onClick={() => handleReject(app.id)}
                        className="flex items-center rounded-lg bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                      >
                        <X className="mr-1 h-4 w-4" />
                        거부
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 상세 정보 모달 */}
      {isDetailsModalOpen && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 mobile:px-4">
          <div className="min-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-light p-6 shadow-lg">
            <div className="mb-4 flex justify-between">
              <h3 className="text-xl font-bold">신청자 정보</h3>
              <button onClick={() => setIsDetailsModalOpen(false)}>
                <X className="h-5 w-5 rounded-full bg-gold-start" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p>
                  <strong>이름: </strong>
                  {selectedApplication.name}
                </p>
                <p>
                  <strong>이메일: </strong>
                  {selectedApplication.email}
                </p>
                <p>
                  <strong>연락처: </strong>
                  {selectedApplication.phone_number}
                </p>
                <p>
                  <strong>전문 분야: </strong>
                  {selectedApplication.specialty}
                </p>
              </div>

              <div>
                <h4 className="font-medium">관련 경력</h4>
                <p className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-3">
                  {selectedApplication.experience}
                </p>
              </div>

              <div>
                <h4 className="font-medium">지원 동기</h4>
                <p className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-3">
                  {selectedApplication.motivation}
                </p>
              </div>

              <div className="grid grid-cols-2">
                {selectedApplication.social_links && (
                  <div>
                    <h4 className="font-medium">소셜/포트폴리오</h4>
                    <a
                      href={
                        selectedApplication.social_links.includes('http')
                          ? selectedApplication.social_links
                          : `https://${selectedApplication.social_links}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border bg-gray-100 px-3 py-1 text-black hover:bg-gold-start"
                    >
                      <ExternalLink className="mr-1 h-4 w-4" />
                      방문
                    </a>
                  </div>
                )}

                {selectedApplication.certificate_url && (
                  <div>
                    <h4 className="font-medium">자격증</h4>
                    <button
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        setIsImageModalOpen(true);
                      }}
                      className="hover:bg-gold inline-flex items-center rounded-lg border bg-gray-100 px-3 py-1 text-black hover:bg-gold-start"
                    >
                      <FileImage className="mr-1 h-4 w-4" />
                      확인
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 모달 */}
      {isImageModalOpen && selectedApplication?.certificate_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedApplication.certificate_url}
              alt="자격증 이미지"
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
