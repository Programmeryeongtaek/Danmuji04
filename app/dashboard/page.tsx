'use client';

import { Course } from '@/app/types/course/courseModel';
import { Lecture } from '@/app/types/knowledge/lecture';
import { createClient } from '@/utils/supabase/client';
import {
  BookmarkIcon,
  BookOpen,
  Calendar,
  GraduationCap,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAllCertificates } from '@/hooks/useAllCertificates';
import { getCategoryTitle } from '../types/course/categories';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';
import { useAllCoursesProgress } from '@/hooks/api/useCourseProgress';

interface DashboardStatsProps {
  enrollmentCourseCount: number;
  completedCoursesCount: number;
  wishlistedCount: number;
  totalStudyTime: number;
  lastActiveDate: string | null;
  streakDays: number;
  studyParticipationCount: number; // 참여 중인 스터디 수
  studyCreatedCount: number; // 생성한 스터디 수
}

// 스터디 정보 타입 정의
interface Study {
  id: string;
  title: string;
  category: string;
  owner_id: string;
  max_participants: number;
  current_participants: number;
  status: 'recruiting' | 'in_progress' | 'completed';
  start_date: string;
  end_date: string;
  role?: 'owner' | 'participant';
}

const DashboardPage = () => {
  const user = useAtomValue(userAtom);

  const { data: progressData = {}, isLoading: progressLoading } =
    useAllCoursesProgress();

  const [stats, setStats] = useState<DashboardStatsProps>({
    enrollmentCourseCount: 0,
    completedCoursesCount: 0,
    wishlistedCount: 0,
    totalStudyTime: 0,
    lastActiveDate: null,
    streakDays: 0,
    studyParticipationCount: 0,
    studyCreatedCount: 0,
  });

  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [recentLectures, setRecentLectures] = useState<Lecture[]>([]);
  const [recentStudies, setRecentStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // certificates 변수 선언 없이 직접 사용 - 타입 명시
  const { data: certificatesData } = useAllCertificates() as {
    data?: {
      certificates: { id: number; category: string; issued_at: string }[];
    };
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // 병렬로 데이터 로드
        const [
          enrollmentsResult,
          bookmarksResult,
          coursesResult,
          lecturesResult,
          studiesResult,
        ] = await Promise.all([
          // 수강 중인 강의
          supabase
            .from('enrollments')
            .select('course_id, courses(*)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(5),

          // 찜 목록
          supabase
            .from('bookmarks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),

          // 최근 강의 목록
          supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(6),

          // 최근 지식 강의
          supabase
            .from('lectures')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(6),

          // 참여 중인 스터디
          supabase
            .from('study_participants')
            .select(
              `
              studies (
                id,
                title,
                category,
                owner_id,
                max_participants,
                current_participants,
                status,
                start_date,
                end_date
              )
            `
            )
            .eq('user_id', user.id)
            .eq('status', 'active'),
        ]);

        // 완료된 코스 수 계산 (progressData 사용)
        const completedCoursesCount =
          progressData && typeof progressData === 'object'
            ? Object.values(progressData).filter(
                (progress) => progress && progress.isCompleted
              ).length
            : 0;

        // 통계 업데이트
        setStats({
          enrollmentCourseCount: enrollmentsResult.data?.length || 0,
          completedCoursesCount,
          wishlistedCount: bookmarksResult.count || 0,
          totalStudyTime: 0, // 추후 구현
          lastActiveDate: null, // 추후 구현
          streakDays: 0, // 추후 구현
          studyParticipationCount: studiesResult.data?.length || 0,
          studyCreatedCount: 0, // 추후 구현
        });

        // 최근 강의 설정 - 타입 캐스팅 추가
        setRecentCourses((coursesResult.data as Course[]) || []);
        setRecentLectures((lecturesResult.data as Lecture[]) || []);

        // 스터디 데이터 설정 - 타입 단언으로 any 제거
        const studyData: Study[] = studiesResult.data
          ? studiesResult.data.map((item: unknown) => {
              const typedItem = item as { studies: Study };
              return {
                ...typedItem.studies,
                role: 'participant' as const,
              };
            })
          : [];
        setRecentStudies(studyData);
      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user, progressData]);

  if (isLoading || progressLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">대시보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold">나의 대시보드</h1>

      {/* 주요 통계 카드 */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">수강 중인 강의</p>
              <p className="text-xl font-bold">
                {stats.enrollmentCourseCount}개
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <GraduationCap className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">완료한 강의</p>
              <p className="text-xl font-bold">
                {stats.completedCoursesCount}개
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <BookmarkIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">찜한 강의</p>
              <p className="text-xl font-bold">{stats.wishlistedCount}개</p>
            </div>
          </div>
        </div>

        {/* 스터디 통계 카드 추가 */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">참여 중인 스터디</p>
              <p className="text-xl font-bold">
                {stats.studyParticipationCount}개
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
            <div className="flex items-center rounded-lg border border-gold-start bg-light px-2 text-center text-sm font-medium text-black hover:bg-gold-start hover:text-white">
              <Link href="/my/certificates">전체보기</Link>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-600">총 진행률</span>
              <span className="text-sm font-medium">
                {stats.completedCoursesCount}/{stats.enrollmentCourseCount} 강의
                완료
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{
                  width: `${
                    stats.enrollmentCourseCount > 0
                      ? (stats.completedCoursesCount /
                          stats.enrollmentCourseCount) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">최근 학습일</p>
              <p className="font-medium">
                {stats.lastActiveDate
                  ? new Date(stats.lastActiveDate).toLocaleDateString()
                  : '아직 학습 기록이 없습니다.'}
              </p>
            </div>
          </div>
        </div>

        {/* 수료증 */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-bold">코스 수료증</h2>
            <div className="flex items-center rounded-lg border border-gold-start bg-light px-2 text-center text-sm font-medium text-black hover:bg-gold-start hover:text-white">
              <Link href="/my/certificates">전체보기</Link>
            </div>
          </div>

          {certificatesData?.certificates &&
          certificatesData.certificates.length > 0 ? (
            <div className="space-y-4">
              {certificatesData.certificates
                .slice(0, 3)
                .map(
                  (cert: {
                    id: number;
                    category: string;
                    issued_at: string;
                  }) => (
                    <div key={cert.id} className="flex items-center gap-3">
                      <div className="rounded-full bg-yellow-100 p-2">
                        <GraduationCap className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {getCategoryTitle(cert.category)}
                        </p>
                        <p className="text-sm text-gray-500">
                          발급일:{' '}
                          {new Date(cert.issued_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500">
              <GraduationCap className="mb-2 h-10 w-10 text-gray-300" />
              <p>아직 수료한 과정이 없습니다.</p>
              <p className="mt-2 text-sm">
                코스를 완료하면 수료증을 받을 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 스터디 참여 현황 섹션 추가 */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold">참여 중인 스터디</h2>

        {recentStudies.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentStudies.map((study) => (
              <Link
                key={study.id}
                href={`/study/${study.id}`}
                className="block rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:border-gold-start hover:bg-light hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="w-4/5 font-medium">{study.title}</h3>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
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
                <p className="text-sm text-gray-500">{study.category}</p>
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-sm">
                    <Users className="mr-1 inline-block h-4 w-4" />
                    {study.current_participants}/{study.max_participants}명
                  </span>
                  <span className="text-sm">
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
              <p className="text-gray-500">참여 중인 스터디가 없습니다.</p>
              <div className="mt-4">
                <Link
                  href="/study"
                  className="mr-4 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  둘러보기
                </Link>
                <Link
                  href="/study/create"
                  className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white hover:bg-gradient-to-l"
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
        <h2 className="mb-4 text-lg font-bold">최근 학습 중인 강의</h2>

        {recentLectures.length > 0 || recentCourses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentLectures.map((lecture) => (
              <Link
                key={lecture.id}
                href={`/knowledge/lecture/${lecture.id}/watch`}
                className="block rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:border-gold-start hover:bg-light hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">{lecture.title}</h3>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-600">
                    강의
                  </span>
                </div>
                <div className="flex h-10 flex-col">
                  <p className="text-sm text-gray-500">{lecture.category}</p>
                  <p className="mt-2 text-sm">강사: {lecture.instructor}</p>
                </div>
              </Link>
            ))}

            {recentCourses.map((course) => (
              <Link
                key={course.id}
                href={`/course/${course.category}/${course.id}`}
                className="block rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">{course.title}</h3>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-600">
                    코스
                  </span>
                </div>
                <div className="flex h-10 flex-col">
                  <p className="text-sm text-gray-500">
                    {getCategoryTitle(course.category)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-6 text-center">
            <p className="text-gray-500">
              최근 학습 중인 강의나 코스가 없습니다.
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <Link
                href="/knowledge"
                className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                강의 둘러보기
              </Link>
              <Link
                href="/course"
                className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
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
