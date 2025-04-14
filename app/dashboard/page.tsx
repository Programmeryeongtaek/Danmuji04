'use client';

import { useAllCertificates } from '@/hooks/useCertificate';
import { useAllCourseProgress } from '@/hooks/useCourse';
import { Course } from '@/types/course/courseModel';
import { Lecture } from '@/types/knowledge/lecture';
import { createClient } from '@/utils/supabase/client';
import { BookmarkIcon, BookOpen, Calendar, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DashboardStatsProps {
  enrollmentCourseCount: number;
  completedCoursesCount: number;
  wishlistedCount: number;
  totalStudyTime: number;
  lastActiveDate: string | null;
  streakDays: number;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStatsProps>({
    enrollmentCourseCount: 0,
    completedCoursesCount: 0,
    wishlistedCount: 0,
    totalStudyTime: 0,
    lastActiveDate: null,
    streakDays: 0,
  });
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [recentLectures, setRecentLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { progressData, isLoading: progressLoading } = useAllCourseProgress();
  const { certificates, isLoading: certificatesLoading } = useAllCertificates();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // 수강 중인 강의 수 가져오기
        const { count: enrolledCount } = await supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active');

        // 찜한 강의 수 가져오기
        const { count: wishlistedCount } = await supabase
          .from('bookmarks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // 최근 활동한 날짜 가져오기
        const { data: lastActivity } = await supabase
          .from('course_progress')
          .select('last_accessed')
          .eq('user_id', user.id)
          .order('last_accessed', { ascending: false })
          .limit(1)
          .single();

        // 최근 수강한 강의 가져오기
        const { data: recentEnrollments } = await supabase
          .from('enrollments')
          .select('lecture_id, enrolled_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('enrolled_at', { ascending: false })
          .limit(3);

        if (recentEnrollments && recentEnrollments.length > 0) {
          const lectureIds = recentEnrollments.map((e) => e.lecture_id);
          const { data: lectures } = await supabase
            .from('lectures')
            .select('*')
            .in('id', lectureIds);

          setRecentLectures(lectures || []);
        }

        // 최근 수강한 코스 가져오기
        const { data: recentProgress } = await supabase
          .from('course_progress')
          .select('course_id, last_accessed')
          .eq('user_id', user.id)
          .order('last_accessed', { ascending: false })
          .limit(3);

        if (recentProgress && recentProgress.length > 0) {
          const courseIds = recentProgress.map((p) => p.course_id);
          const { data: courses } = await supabase
            .from('courses')
            .select('*')
            .in('id', courseIds);

          setRecentCourses(courses || []);
        }

        // 완료한 코스 수 계산
        let completedCount = 0;
        if (progressData) {
          completedCount = Object.values(progressData).filter(
            (p) => p.completed
          ).length;
          // 완료한 강의 수가 수강 중인 강의 수를 초과하지 않도록 제한
          completedCount = Math.min(completedCount, enrolledCount || 0);
        }

        // 임의의 학습 시간 (실제로는 저장된 데이터를 사용)
        const totalStudyTime = Math.floor(Math.random() * 50) + 10;

        // 연속 학습일 (임의 값 - 실제로는 저장된 데이터 사용)
        const streakDays = Math.floor(Math.random() * 10) + 1;

        setStats({
          enrollmentCourseCount: enrolledCount || 0,
          completedCoursesCount: completedCount,
          wishlistedCount: wishlistedCount || 0,
          totalStudyTime: totalStudyTime,
          lastActiveDate: lastActivity?.last_accessed || null,
          streakDays: streakDays,
        });
      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [progressData]);

  if (isLoading || progressLoading || certificatesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">대시보드 로딩 중...</div>
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
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 학습 현황 */}
        <div className="col-span-2 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">나의 학습 현황</h2>

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

          <div className="mt-4">
            <Link
              href="/my/learning"
              className="text-sm font-medium text-blue-500 hover:underline"
            >
              모든 수강 중인 강의 보기 →
            </Link>
          </div>
        </div>

        {/* 수료증 */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">나의 수료증</h2>

          {certificates && certificates.length > 0 ? (
            <div className="space-y-4">
              {certificates.slice(0, 3).map((cert) => (
                <div key={cert.id} className="flex items-center gap-3">
                  <div className="rounded-full bg-yellow-100 p-2">
                    <GraduationCap className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">{cert.category} 수료증</p>
                    <p className="text-sm text-gray-500">
                      발급일: {new Date(cert.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}

              <div className="mt-4">
                <Link
                  href="/my/certificates"
                  className="text-sm font-medium text-blue-500 hover:underline"
                >
                  모든 수료증 보기 →
                </Link>
              </div>
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

      {/* 최근 학습 중인 강의/코스 */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold">최근 학습 중인 강의</h2>

        {recentLectures.length > 0 || recentCourses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentLectures.map((lecture) => (
              <Link
                key={lecture.id}
                href={`/knowledge/lecture/${lecture.id}/watch`}
                className="block rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">{lecture.title}</h3>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-600">
                    강의
                  </span>
                </div>
                <p className="text-sm text-gray-500">{lecture.category}</p>
                <p className="mt-2 text-sm">강의자: {lecture.instructor}</p>
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
                <p className="text-sm text-gray-500">{course.category}</p>
                <p className="mt-2 text-sm">강의자: {course.instructor_name}</p>
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
