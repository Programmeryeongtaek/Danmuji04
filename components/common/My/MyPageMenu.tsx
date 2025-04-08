'use client';

import {
  Award,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  Heart,
  PencilLine,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '../Toast/Context';
import { createClient } from '@/utils/supabase/client';
import Button from '../Button/Button';
import Image from 'next/image';

interface UserProfile {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  interests: string[];
  created_at: string;
}

interface UserStats {
  enrolledCourses: number;
  completedCourses: number;
  writingsCount: number;
  certificatesCount: number;
  wishlistCount: number;
}

const MyPageMenu = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    writingsCount: 0,
    certificatesCount: 0,
    wishlistCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // 사용자 프로필 및 통계 데이터 로드
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      const supabase = createClient();

      try {
        // 현재 사용자 확인
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          showToast('로그인이 필요합니다.', 'error');
          return;
        }

        // 프로필 정보 가져오기
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // 프로필 이미지 URL 생성
        let avatarUrl = null;
        if (profileData?.avatar_url) {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(profileData.avatar_url);

          avatarUrl = urlData.publicUrl;
        }

        setProfile({
          ...profileData,
          avatar_url: avatarUrl,
        });

        // 통계 데이터 가져오기
        // 1. 수강 중인 강의 수
        const { count: enrolledCount } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active');

        // 2. 완료한 강의 수 - 진행률 100%인 강의
        // 여기서는 간단하게 enrollments 테이블에서 가져오지만
        // 실제로는 진행률 계산 함수를 이용해야 할 수 있음
        const { count: completedCount } = await supabase
          .from('lecture_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('completed', true);

        // 3. 작성한 글 수
        const { count: writingsCount } = await supabase
          .from('course_writings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // 4. 수료증 수
        const { count: certificatesCount } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // 5. 찜 목록 수
        const { count: wishlistCount } = await supabase
          .from('bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setStats({
          enrolledCourses: enrolledCount || 0,
          completedCourses: completedCount || 0,
          writingsCount: writingsCount || 0,
          certificatesCount: certificatesCount || 0,
          wishlistCount: wishlistCount || 0,
        });
      } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
        showToast('데이터를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [showToast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <h2 className="mb-4 text-xl font-bold">로그인이 필요합니다</h2>
        <p className="mb-6 text-gray-600">내 페이지를 보려면 로그인해주세요.</p>
        <Button className="px-6 py-2">로그인</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-8 text-2xl font-bold">내 페이지</h1>

      <div className="mb-8 flex flex-col gap-6 md:flex-row">
        {/* 사용자 프로필 카드 */}
        <div className="w-full rounded-lg border bg-white p-6 shadow-sm md:w-1/3">
          <div className="mb-4 flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="프로필 이미지"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-10 w-10 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {profile.nickname || profile.name || '사용자'}
              </h2>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <div className="mt-1">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                  {profile.role === 'instructor'
                    ? '강사'
                    : profile.role === 'admin'
                      ? '관리자'
                      : profile.role === 'manager'
                        ? '매니저'
                        : '회원'}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-gray-500">
              관심 분야
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests && profile.interests.length > 0 ? (
                profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    {interest}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">
                  설정된 관심분야가 없습니다
                </span>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-gray-500">가입일</h3>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Calendar className="h-4 w-4" />
              {new Date(profile.created_at).toLocaleDateString('ko-KR')}
            </div>
          </div>

          <Link href="/settings/profile">
            <Button className="mt-2 w-full py-2 text-sm">프로필 수정</Button>
          </Link>
        </div>

        {/* 사용자 통계 */}
        <div className="flex w-full flex-1 flex-col gap-4 md:w-2/3">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">학습 현황</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-blue-50 p-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">수강 중인 강의</span>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {stats.enrolledCourses}
                </p>
              </div>
              <div className="rounded-lg border bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">완료한 강의</span>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {stats.completedCourses}
                </p>
              </div>
              <div className="rounded-lg border bg-yellow-50 p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium">작성한 글</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{stats.writingsCount}</p>
              </div>
              <div className="rounded-lg border bg-purple-50 p-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">수료증</span>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {stats.certificatesCount}
                </p>
              </div>
              <div className="rounded-lg border bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium">찜한 강의</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{stats.wishlistCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메뉴 섹션 */}
      <div className="grid gap-6 md:grid-cols-3">
        <MenuCard
          title="내 학습"
          icon={BookOpen}
          items={[
            { label: '학습 중인 강의', href: '/my/learning' },
            { label: '이어서 학습하기', href: '/' },
            { label: '작성한 글 보기', href: '/my/writings' },
          ]}
        />
        <MenuCard
          title="내 강의 관리"
          icon={PencilLine}
          items={[
            { label: '강의 목록', href: '/my/lectures' },
            { label: '강의 등록하기', href: '/my/lectureCreate' },
          ]}
          hideWhen={
            profile.role !== 'instructor' &&
            profile.role !== 'admin' &&
            profile.role !== 'manager'
          }
        />
        <MenuCard
          title="내 자료"
          icon={FileText}
          items={[
            { label: '찜한 강의', href: '/my/wishlist' },
            { label: '수료증 모음', href: '/my/certificates' },
            { label: '알림 센터', href: '/my/notifications' },
          ]}
        />
      </div>
    </div>
  );
};

// 메뉴 카드 컴포넌트
interface MenuCardProps {
  title: string;
  icon: React.ElementType;
  items: { label: string; href: string }[];
  hideWhen?: boolean;
}

const MenuCard = ({
  title,
  icon: Icon,
  items,
  hideWhen = false,
}: MenuCardProps) => {
  if (hideWhen) return null;

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-700" />
        <h2 className="font-bold">{title}</h2>
      </div>
      <nav className="space-y-2">
        {items.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="block rounded-lg px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default MyPageMenu;
