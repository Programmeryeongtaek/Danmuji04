'use client';

import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { Check, X } from 'lucide-react';
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
}

export default function InstructorApplicationsPage() {
  const [applications, setApplications] = useState<InstructorApplication[]>([]);
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
    <div className="container mx-auto p-4">
      <h1 className="mb-8 text-2xl font-bold">강사 신청 관리</h1>

      <div className="mb-4 overflow-hidden rounded-lg border">
        <div className="grid grid-cols-12 gap-4 bg-gray-100 p-4 font-medium text-gray-700">
          <div className="col-span-2">신청자</div>
          <div className="col-span-1">분야</div>
          <div className="col-span-3">경력</div>
          <div className="col-span-3">지원 동기</div>
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
              <div key={app.id} className="grid grid-cols-12 gap-4 p-4">
                <div className="col-span-2">
                  <div className="font-medium">{app.name}</div>
                  <div className="text-sm text-gray-500">{app.email}</div>
                  <div className="text-sm text-gray-500">
                    {app.phone_number}
                  </div>
                </div>
                <div className="col-span-1">{app.specialty}</div>
                <div className="col-span-3 whitespace-pre-wrap text-sm">
                  {app.experience}
                </div>
                <div className="col-span-3 whitespace-pre-wrap text-sm">
                  {app.motivation}
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
                      ? '승인됨'
                      : app.status === 'rejected'
                        ? '거부됨'
                        : '대기중'}
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
    </div>
  );
}
