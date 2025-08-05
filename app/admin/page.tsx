'use client';

import { useToast } from '@/components/common/Toast/Context';
import { useAdminStats } from '@/hooks/api/useAdminStats';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import {
  Bell,
  FileText,
  MessageSquare,
  RefreshCw,
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

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);

  const router = useRouter();
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  // 통계 데이터 관리
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
    isFetching: isRefreshing,
  } = useAdminStats();

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdminAuth = async () => {
      if (!user) {
        setAdminCheckLoading(false);
        return;
      }

      const supabase = createClient();

      try {
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

  // 통계 에러 처리
  useEffect(() => {
    if (statsError) {
      console.error('통계 데이터 로드 실패:', statsError);
      showToast('통계 정보를 불러오는데 실패했습니다.', 'error');
    }
  }, [statsError, showToast]);

  // 안전한 통계 데이터 사용
  const displayStats = stats || {
    totalUsers: 0,
    totalInstructors: 0,
    pendingApplications: 0,
    pendingInquiries: 0,
  };

  const isLoading = adminCheckLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
          <p className="text-gray-600">
            {adminCheckLoading ? '권한 확인 중...' : '통계 데이터 로딩 중...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto px-4 py-12 mobile:mb-10 tablet:mb-0 tablet:px-6">
      {/* 헤더에 새로고침 버튼 추가 */}
      <div className="flex items-center justify-between mobile:mb-4 tablet:mb-6">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <button
          onClick={() => refetchStats()}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:bg-gray-50 disabled:opacity-50"
          title="통계 새로고침"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          {isRefreshing ? '로딩...' : '새로고침'}
        </button>
      </div>

      {/* 통계 카드 섹션 - displayStats 사용 */}
      <div className="mb-10 grid gap-4 mobile:grid-cols-2 laptop:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-gray-500">전체 사용자 수</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">{displayStats.totalUsers}</div>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-gray-500">전체 강사 수</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">
              {displayStats.totalInstructors}
            </div>
            <ShieldCheck className="h-5 w-5 text-green-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-gray-500">대기중인 강사 신청</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">
              {displayStats.pendingApplications}
            </div>
            <FileText className="h-5 w-5 text-amber-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-gray-500">읽지 않은 문의</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">
              {displayStats.pendingInquiries}
            </div>
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
                {/* 배지 표시 */}
                {item.badge &&
                  (() => {
                    const count =
                      item.title === '강사 신청 관리'
                        ? displayStats.pendingApplications
                        : displayStats.pendingInquiries;

                    return count > 0 ? (
                      <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                        {count}
                      </span>
                    ) : null;
                  })()}
              </div>
              <p className="mt-1 text-sm text-gray-600">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 에러 상태 표시 */}
      {statsError && (
        <div className="mt-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                통계 데이터를 불러오는 중 오류가 발생했습니다.
                <button
                  onClick={() => refetchStats()}
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
