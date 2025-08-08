'use client';

import {
  BookmarkIcon,
  BookOpen,
  Calendar,
  GraduationCap,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { getCategoryTitle } from '../types/course/categories';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';
import {
  useDashboardData,
  useRecentCourses,
  useRecentLectures,
  useRecentStudies,
} from '@/hooks/api/useDashboardStats';
import { useRecentCertificates } from '@/hooks/api/useCertificates';

const DashboardPage = () => {
  const user = useAtomValue(userAtom);

  const {
    data: dashboardStats,
    isLoading: statsLoading,
    error: statsError,
  } = useDashboardData();

  const { data: recentLectures = [], isLoading: recentLecturesLoading } =
    useRecentLectures(6);

  const { data: recentCourses = [], isLoading: recentCoursesLoading } =
    useRecentCourses(6);

  const { data: recentStudies = [], isLoading: recentStudiesLoading } =
    useRecentStudies(3);

  const { data: certificates = [], isLoading: certificatesLoading } =
    useRecentCertificates(3);

  // 전체 로딩 상태 계산
  const isAnyLoading =
    statsLoading ||
    recentLecturesLoading ||
    recentCoursesLoading ||
    recentStudiesLoading ||
    certificatesLoading;

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  // 로딩 상태
  if (isAnyLoading && !dashboardStats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">대시보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (statsError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">
            대시보드 데이터를 불러오는데 실패했습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 사용자 미로그인 상태
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">로그인이 필요합니다.</p>
          <Link
            href="/login"
            className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">나의 대시보드</h1>
        {isAnyLoading && (
          <div className="flex items-center text-sm text-gray-500">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            업데이트 중...
          </div>
        )}
      </div>

      {/* 주요 통계 카드 */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">수강 중인 강의</p>
              <p className="text-xl font-bold">
                {dashboardStats.enrolledLecturesCount}개
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <GraduationCap className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">완료한 강의</p>
              <p className="text-xl font-bold">
                {dashboardStats.completedLecturesCount}개
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <BookmarkIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">찜한 강의</p>
              <p className="text-xl font-bold">
                {dashboardStats.wishlistedCount}개
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">참여 중인 스터디</p>
              <p className="text-xl font-bold">
                {dashboardStats.studyParticipationCount}개
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 학습 현황 */}
        <div className="col-span-2 rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-bold">학습 현황</h2>
            <Link
              href="/my/learning"
              className="flex items-center rounded-lg border border-gold-start bg-light px-2 text-center text-sm font-medium text-black transition-colors hover:bg-gold-start hover:text-white"
            >
              전체보기
            </Link>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-600">강의 진행률</span>
              <span className="text-sm font-medium">
                {dashboardStats.completedLecturesCount}/
                {dashboardStats.enrolledLecturesCount} 강의 완료
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-500 ease-out"
                style={{
                  width: `${
                    dashboardStats.enrolledLecturesCount > 0
                      ? (dashboardStats.completedLecturesCount /
                          dashboardStats.enrolledLecturesCount) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="mt-2 text-right text-xs text-gray-500">
              {dashboardStats.enrolledLecturesCount > 0
                ? `${Math.round((dashboardStats.completedLecturesCount / dashboardStats.enrolledLecturesCount) * 100)}% 완료`
                : '진행 중인 강의가 없습니다'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">최근 학습일</p>
              <p className="font-medium">
                {dashboardStats.lastActiveDate
                  ? new Date(dashboardStats.lastActiveDate).toLocaleDateString(
                      'ko-KR'
                    )
                  : '아직 학습 기록이 없습니다.'}
              </p>
            </div>
          </div>
        </div>

        {/* 수료증 */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-bold">코스 수료증</h2>
            <Link
              href="/my/certificates"
              className="flex items-center rounded-lg border border-gold-start bg-light px-2 text-center text-sm font-medium text-black transition-colors hover:bg-gold-start hover:text-white"
            >
              전체보기
            </Link>
          </div>

          {certificates && certificates.length > 0 ? (
            <div className="space-y-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <div className="rounded-full bg-yellow-100 p-2">
                    <GraduationCap className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {getCategoryTitle(cert.category)}
                    </p>
                    <p className="text-sm text-gray-500">
                      발급일:{' '}
                      {new Date(cert.issued_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500">
              <GraduationCap className="mb-2 h-10 w-10 text-gray-300" />
              <p className="mb-1">아직 수료한 과정이 없습니다.</p>
              <p className="text-sm">
                코스를 완료하면 수료증을 받을 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 스터디 참여 현황 */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">참여 중인 스터디</h2>
          {recentStudiesLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
          )}
        </div>

        {recentStudies.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentStudies.map((study) => (
              <Link
                key={study.id}
                href={`/study/${study.id}`}
                className="block rounded-lg border bg-white p-4 shadow-sm transition-all hover:border-gold-start hover:bg-light hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="line-clamp-2 w-4/5 font-medium">
                    {study.title}
                  </h3>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-1 text-xs ${
                      study.status === 'recruiting'
                        ? 'bg-green-100 text-green-600'
                        : study.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {study.status === 'recruiting'
                      ? '모집중'
                      : study.status === 'in_progress'
                        ? '진행중'
                        : '완료'}
                  </span>
                </div>
                <p className="mb-2 text-sm text-gray-500">{study.category}</p>
                <div className="flex flex-col gap-1 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Users className="mr-1 h-4 w-4" />
                    {study.current_participants}/{study.max_participants}명
                  </span>
                  <span className="text-xs">
                    {formatDate(study.start_date)} ~{' '}
                    {formatDate(study.end_date)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-6 text-center">
            <div className="flex flex-col items-center justify-center">
              <Users className="mb-3 h-12 w-12 text-gray-300" />
              <p className="mb-4 text-gray-500">참여 중인 스터디가 없습니다.</p>
              <div className="flex gap-4">
                <Link
                  href="/study"
                  className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                >
                  둘러보기
                </Link>
                <Link
                  href="/study/create"
                  className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition-all hover:bg-gradient-to-l"
                >
                  개설하기
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 최근 학습 중인 강의/코스 */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">최근 학습 중인 강의</h2>
          {(recentLecturesLoading || recentCoursesLoading) && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          )}
        </div>

        {recentLectures.length > 0 || recentCourses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentLectures.map((lecture) => (
              <Link
                key={`lecture-${lecture.id}`}
                href={`/knowledge/lecture/${lecture.id}/watch`}
                className="block rounded-lg border bg-white p-4 shadow-sm transition-all hover:border-gold-start hover:bg-light hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="line-clamp-2 flex-1 font-medium">
                    {lecture.title}
                  </h3>
                  <span className="ml-2 flex-shrink-0 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-600">
                    강의
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{lecture.category}</p>
                  <p className="text-sm">강사: {lecture.instructor}</p>
                </div>
              </Link>
            ))}

            {recentCourses.map((course) => (
              <Link
                key={`course-${course.id}`}
                href={`/course/${course.category}/${course.id}`}
                className="block rounded-lg border bg-white p-4 shadow-sm transition-all hover:border-gold-start hover:bg-light hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="line-clamp-2 flex-1 font-medium">
                    {course.title}
                  </h3>
                  <span className="ml-2 flex-shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs text-green-600">
                    코스
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">
                    {getCategoryTitle(course.category)}
                  </p>
                  <p className="text-sm">강사: {course.instructor_name}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-6 text-center">
            <p className="mb-4 text-gray-500">
              최근 학습 중인 강의나 코스가 없습니다.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/knowledge"
                className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                강의 둘러보기
              </Link>
              <Link
                href="/course"
                className="rounded-lg bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
              >
                코스 둘러보기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
