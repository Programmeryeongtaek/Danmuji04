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
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import Button from '../common/Button/Button';
import Image from 'next/image';
import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import { userProfileAtom } from '@/store/my/userProfileAtom';
import { getAvatarUrl } from '@/utils/common/avatarUtils';

interface UserStats {
  enrolledCourses: number;
  completedCourses: number;
  writingsCount: number;
  certificatesCount: number;
  wishlistCount: number;
  studiesParticipatingCount: number; // 참여 중인 스터디 수
  studiesCreatedCount: number; // 생성한 스터디 수
}

const MyPageMenu = () => {
  const user = useAtomValue(userAtom);
  const profile = useAtomValue(userProfileAtom);
  const avatarUrl = getAvatarUrl(profile?.avatar_url);

  const [stats, setStats] = useState<UserStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    writingsCount: 0,
    certificatesCount: 0,
    wishlistCount: 0,
    studiesParticipatingCount: 0,
    studiesCreatedCount: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const { showToast } = useToast();

  // 사용자 프로필 및 통계 데이터 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (!user || !profile) {
        setIsLoadingStats(false);
        return;
      }

      setIsLoadingStats(true);
      const supabase = createClient();

      try {
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

        // 6. 참여 중인 스터디 수
        const { count: participatingStudiesCount } = await supabase
          .from('study_participants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'approved');

        // 7. 생성한 스터디 수
        const { count: createdStudiesCount } = await supabase
          .from('studies')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        setStats({
          enrolledCourses: enrolledCount || 0,
          completedCourses: completedCount || 0,
          writingsCount: writingsCount || 0,
          certificatesCount: certificatesCount || 0,
          wishlistCount: wishlistCount || 0,
          studiesParticipatingCount: participatingStudiesCount || 0,
          studiesCreatedCount: createdStudiesCount || 0,
        });
      } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
        showToast('데이터를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadUserData();
  }, [user, profile, showToast]);

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <h2 className="mb-4 text-xl font-bold">로그인이 필요합니다</h2>
        <p className="mb-6 text-gray-600">로그인해주세요.</p>
        <Button className="px-6 py-2">로그인</Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">프로필 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl mobile:mb-10 mobile:px-4 mobile:py-12 tablet:mb-0 tablet:px-6">
      <h1 className="text-2xl font-bold mobile:mb-4 tablet:mb-6 laptop:mb-8">
        내 페이지
      </h1>

      <div className="mb-8 flex flex-col gap-6 md:flex-row">
        {/* 사용자 프로필 카드 */}
        <div className="w-full rounded-lg border bg-white p-6 shadow-sm md:w-1/3">
          <div className="mb-4 flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
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
            <h3 className="mb-2 text-sm font-medium text-black">관심 분야</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests && profile.interests.length > 0 ? (
                profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-light px-3 py-1 text-sm text-gray-700"
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
            <h3 className="mb-2 text-sm font-medium text-black">가입일</h3>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Calendar className="h-4 w-4" />
              {new Date(profile.created_at).toLocaleDateString('ko-KR')}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Link href="/settings/profile">
              <Button className="w-full py-2 text-sm">프로필 수정</Button>
            </Link>
            <Link href="/study/create">
              <Button className="w-full bg-gradient-to-r from-gold-start to-gold-end py-2 text-sm text-white hover:opacity-90">
                스터디 개설
              </Button>
            </Link>
          </div>
        </div>

        {/* 사용자 통계 */}
        <div className="flex w-full flex-1 flex-col gap-4 md:w-2/3">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">학습 현황</h2>
            {isLoadingStats ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-lg border bg-gray-50 p-4"
                  >
                    <div className="mb-2 h-4 w-16 rounded bg-gray-200"></div>
                    <div className="h-6 w-8 rounded bg-gray-200"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-blue-50 p-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">수강 중인 강의</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-blue-600">
                    {stats.enrolledCourses}
                  </p>
                </div>

                <div className="rounded-lg border bg-green-50 p-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">완료한 강의</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-green-600">
                    {stats.completedCourses}
                  </p>
                </div>

                <div className="rounded-lg border bg-purple-50 p-4">
                  <div className="flex items-center gap-2">
                    <PencilLine className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium">작성한 글</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-purple-600">
                    {stats.writingsCount}
                  </p>
                </div>

                <div className="rounded-lg border bg-yellow-50 p-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium">수료증</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-yellow-600">
                    {stats.certificatesCount}
                  </p>
                </div>

                <div className="rounded-lg border bg-pink-50 p-4">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-600" />
                    <span className="text-sm font-medium">찜한 강의</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-pink-600">
                    {stats.wishlistCount}
                  </p>
                </div>

                <div className="rounded-lg border bg-indigo-50 p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-medium">참여 스터디</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-indigo-600">
                    {stats.studiesParticipatingCount}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 스터디 현황 섹션 추가 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex justify-between gap-2">
              <div className="flex items-center gap-1">
                <Users className="h-5 w-5 text-gold-start" />
                <h2 className="text-lg font-bold">스터디 활동</h2>
              </div>

              <Button className="px-4 text-white hover:opacity-90">
                <Link href="/my/studies">관리</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 rounded-lg bg-purple-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">참여 스터디</p>
                    <p className="text-xl font-bold">
                      {stats.studiesParticipatingCount}개
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-400" />
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">개설한 스터디</p>
                    <p className="text-xl font-bold">
                      {stats.studiesCreatedCount}개
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end"></div>
          </div>
        </div>
      </div>

      {/* 메뉴 섹션 */}
      <div className="grid gap-6 tablet:grid-cols-3">
        <MenuCard
          title="내 학습"
          icon={BookOpen}
          items={[
            { label: '학습 중인 강의', href: '/my/learning' },
            // { label: '이어서 학습하기', href: '/' },
            { label: '작성한 글 보기', href: '/my/writings' },
          ]}
        />

        {/* 스터디 메뉴 카드 추가 */}
        <MenuCard
          title="내 스터디"
          icon={Users}
          items={[
            { label: '참여 중인 스터디', href: '/my/studies' },
            { label: '개설한 스터디', href: '/my/studies?type=created' },
            { label: '스터디 북마크', href: '/my/study-bookmarks' },
            { label: '도서 추천', href: '/study?category=book' },
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
            className="block rounded-lg px-4 py-2 text-gray-700 transition-colors hover:bg-light hover:text-black"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default MyPageMenu;
