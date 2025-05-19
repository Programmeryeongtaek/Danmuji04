'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import {
  Bell,
  FileText,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// 관리자 대시보드 메뉴 정의
const adminMenuItems = [
  {
    title: '강사 신청 관리',
    icon: FileText,
    href: '/admin/instructor-applications',
    description: '신규 강사 신청 검토 및 승인',
    badge: true,
  },
  {
    title: '강사 관리',
    icon: Users,
    href: '/admin/instructors',
    description: '등록된 강사 정보 관리 및 권한 설정',
  },
  {
    title: '문의 응답 관리',
    icon: MessageSquare,
    href: '/admin/inquiries',
    description: '사용자 문의 내역 확인 및 응답',
    badge: true,
  },
  {
    title: '사용자 권한 관리',
    icon: ShieldCheck,
    href: '/admin/user-roles',
    description: '사용자 등급 및 권한 설정',
  },
  {
    title: '알림 관리',
    icon: Bell,
    href: '/admin/notifications',
    description: '시스템 알림 설정 및 발송',
  },
];

// 대시보드 통계 타입 정의
interface DashboardStats {
  totalUsers: number;
  totalInstructors: number;
  pendingApplications: number;
  pendingInquiries: number;
}

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalInstructors: 0,
    pendingApplications: 0,
    pendingInquiries: 0,
  });

  const router = useRouter();
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  useEffect(() => {
    const checkAdminAndLoadStats = async () => {
      if (!user) {
        return;
      }

      const supabase = createClient();

      // 관리자 권한 확인
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('프로필 정보 조회 오류:', profileError);
        router.push('/');
        showToast('사용자 정보를 불러올 수 없습니다.', 'error');
        return;
      }

      if (!profile || profile.role !== 'admin') {
        router.push('/');
        showToast('관리자 권한이 필요합니다.', 'error');
        return;
      }

      setIsAdmin(true);

      // 통계 데이터 로드
      try {
        // 1. 전체 사용자 수
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // 2. 강사 수
        const { count: totalInstructors } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'instructor');

        // 3. 대기 중인 강사 신청 수
        const { count: pendingApplications } = await supabase
          .from('instructor_applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // 4. 대기 중인 문의 수
        const { count: pendingInquiries } = await supabase
          .from('contact_messages')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'unread');

        setStats({
          totalUsers: totalUsers || 0,
          totalInstructors: totalInstructors || 0,
          pendingApplications: pendingApplications || 0,
          pendingInquiries: pendingInquiries || 0,
        });
      } catch (error) {
        console.error('통계 데이터 로드 실패:', error);
        showToast('통계 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAndLoadStats();
  }, [user, router, showToast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // 관리자 권한 체크 중이거나 권한이 없는 경우 아무것도 표시하지 않음
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold">관리자 대시보드</h1>

      {/* 통계 카드 섹션 */}
      <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-gray-500">전체 사용자 수</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-gray-500">등록된 강사 수</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">{stats.totalInstructors}</div>
            <ShieldCheck className="h-5 w-5 text-blue-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-gray-500">대기중인 강사 신청</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">
              {stats.pendingApplications}
            </div>
            <FileText className="h-5 w-5 text-amber-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-gray-500">읽지 않은 문의</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">{stats.pendingInquiries}</div>
            <MessageSquare className="h-5 w-5 text-red-500" />
          </div>
        </div>
      </div>

      {/* 관리자 메뉴 섹션 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminMenuItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex items-start rounded-lg border bg-white p-5 shadow-sm transition hover:border-gold-start hover:bg-light hover:shadow-md"
          >
            <div className="mr-4 rounded-full bg-gold-start/10 p-3">
              <item.icon className="h-6 w-6 text-gold-start" />
            </div>
            <div>
              <div className="flex items-center">
                <h3 className="font-medium">{item.title}</h3>
                {item.badge &&
                  stats[
                    item.title === '강사 신청 관리'
                      ? 'pendingApplications'
                      : 'pendingInquiries'
                  ] > 0 && (
                    <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                      {item.title === '강사 신청 관리'
                        ? stats.pendingApplications
                        : stats.pendingInquiries}
                    </span>
                  )}
              </div>
              <p className="mt-1 text-sm text-gray-600">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
