'use client';

import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useEnrollmentStats } from './useEnrollment';

export interface RecentLecture {
  id: number;
  title: string;
  instructor: string;
  category: string;
  thumbnail_url: string | null;
  created_at: string;
}

export interface RecentCourse {
  id: string;
  title: string;
  category: string;
  instructor_name: string;
  thumbnail_url: string | null;
  created_at: string;
}

export interface StudyInfo {
  id: string;
  title: string;
  category: string;
  owner_id: string;
  max_participants: number;
  current_participants: number;
  status: 'recruiting' | 'in_progress' | 'completed';
  start_date: string;
  end_date: string;
  role: 'owner' | 'participant';
}

export interface DashboardSummary {
  enrolledLecturesCount: number;
  completedLecturesCount: number;
  wishlistedCount: number;
  studyParticipationCount: number;
  studyCreatedCount: number;
  lastActiveDate: string | null;
  totalStudyTime: number; // TODO: 향후 구현
  streakDays: number; // TODO: 향후 구현
}

// 쿼리 키 팩토리
export const dashboardKeys ={ 
  all: ['dashboard'] as const,
  wishlist: () => [...dashboardKeys.all, 'wishlist'] as const,
  studyStats: () => [...dashboardKeys.all, 'study-stats'] as const,
  lastActive: () => [...dashboardKeys.all, 'last-active'] as const,
  recent: () => [...dashboardKeys.all, 'recent'] as const,
  recentLectures: (limit: number) => [...dashboardKeys.recent(), 'lectures', limit] as const,
  recentCourses: (limit: number) => [...dashboardKeys.recent(), 'courses', limit] as const,
  recentStudies: (limit: number) => [...dashboardKeys.recent(), 'studies', limit] as const,
  completedLecturesCount: () => [...dashboardKeys.all, 'completed-lectures'] as const,
};

// 찜하기 개수 조회
export const useWishlistCount = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: dashboardKeys.wishlist(),
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const supabase = createClient();

      const { count, error } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;

      return count || 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// 스터디 통계 조회
export const useStudyStats = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: dashboardKeys.studyStats(),
    queryFn: async (): Promise<{
      participationCount: number;
      createdCount: number;
    }> => {
      if (!user) return { participationCount: 0, createdCount: 0};

      const supabase = createClient();

      // 병렬로 스터디 통계 조회
      const [participationResult, createdResult] = await Promise.all([
        supabase
          .from('study_participants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'approved'),

        supabase
          .from('studies')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id)
      ]);

      if (participationResult.error) throw participationResult.error;
      if (createdResult.error) throw createdResult.error;

      return {
        participationCount: participationResult.count || 0,
        createdCount: createdResult.count || 0,
      };
    },
    enabled: !!user,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

// 마지막 학습일 조회
export const useLastActiveDate = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: dashboardKeys.lastActive(),
    queryFn: async (): Promise<string | null> => {
      if (!user) return null;

      const supabase = createClient();

      // 병렬로 최근 학습 기록 조회
      const [courseProgressResult, lectureProgressResult] = await Promise.all([
        supabase
          .from('course_progress')
          .select('last_accessed')
          .eq('user_id', user.id)
          .order('last_accessed', { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from('lecture_progress')
          .select('updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (courseProgressResult.error) throw courseProgressResult.error;
      if (lectureProgressResult.error) throw lectureProgressResult.error;

      // 가장 최근 날짜 반환
      const courseLastDate = courseProgressResult.data?.last_accessed;
      const lectureLastDate = lectureProgressResult.data?.updated_at;

      if (courseLastDate && lectureLastDate) {
        return new Date(courseLastDate) > new Date(lectureLastDate)
          ? courseLastDate
          : lectureLastDate;
      }

      return courseLastDate || lectureLastDate || null;
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 학습 활동은 실시간성이 중요하므로
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// 완료된 강의 수 조회 (대시보드 전용)
export const useCompletedLecturesCount = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: dashboardKeys.completedLecturesCount(),
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const supabase = createClient();

      // 수강 중인 강의 목록 조회
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('lecture_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (enrollmentsError) throw enrollmentsError;

      if (!enrollments?.length) return 0;

      let completedCount = 0;

      // 각 강의별로 완료 상태 확인
      const completionPromises = enrollments.map(async (enrollment) => {
        try {
          // 강의의 총 섹션 조회
          const { data: sections } = await supabase
            .from('lecture_sections')
            .select('id')
            .eq('lecture_id', enrollment.lecture_id);

          if (!sections?.length) return false;

          const sectionIds = sections.map(s => s.id);

          // 총 아이템 수 조회
          const { count: totalItems } = await supabase
            .from('lecture_items')
            .select('*', { count: 'exact', head: true })
            .in('section_id', sectionIds);

          // 완료된 아이템 수 조회
          const { count: completedItems } = await supabase
            .from('lecture_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('lecture_id', enrollment.lecture_id)
            .eq('completed', true);

          // 100% 완료된 강의만 카운트
          return totalItems && completedItems && completedItems >= totalItems;
        } catch (error) {
          console.error(`강의 ${enrollment.lecture_id} 완료 상태 확인 실패:`, error);
        }
      });

      const completionResults = await Promise.all(completionPromises);
      completedCount = completionResults.filter(Boolean).length;

      return completedCount;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 학습 진도는 자주 변할 수 있음
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// 최근 강의 목록 조회
export const useRecentLectures = (limit: number = 6) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: dashboardKeys.recentLectures(limit),
    queryFn: async (): Promise<RecentLecture[]> => {
      if (!user) return [];

      const supabase = createClient();

      // 최근 수강 신청한 강의 조회
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('lecture_id, enrolled_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false })
        .limit(limit);

      if (enrollmentsError) throw enrollmentsError;

      if (!enrollments?.length) return [];

      // 강의 상세 정보 조회
      const lectureIds = enrollments.map(e => e.lecture_id);
      const { data: lectures, error: lecturesError } = await supabase
        .from('lectures')
        .select('id, title, instructor, category, thumbnail_url, created_at')
        .in('id', lectureIds);

      if (lecturesError) throw lecturesError;

      // 수강 신청 순서대로 정렬
      const sortedLectures = enrollments
        .map(enrollment =>
          lectures?.find(lecture => lecture.id === enrollment.lecture_id)
        )
        .filter((lecture): lecture is NonNullable<typeof lecture> => !!lecture)
        .map(lecture => ({
          ...lecture,
          thumbnail_url: lecture.thumbnail_url || null,
        }));

      return sortedLectures;
    },
    enabled: !!user,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

// 최근 코스 목록 조회
export const useRecentCourses = (limit: number = 6) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: dashboardKeys.recentCourses(limit),
    queryFn: async (): Promise<RecentCourse[]> => {
      if (!user) return [];

      const supabase = createClient();

      // 최근 학습한 코스 조회
      const { data: recentProgress, error: progressError } = await supabase
        .from('course_progress')
        .select('course_id, last_accessed')
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false })
        .limit(limit);

      if (progressError) throw progressError;

      if (!recentProgress?.length) return [];

      // 코스 상세 정보 조회
      const courseIds = recentProgress.map(p => p.course_id);
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, category, instructor_name, description, created_at')
        .in('id', courseIds);

      if (coursesError) throw coursesError;

      // 최근 학습 순서대로 정렬
      const sortedCourses = recentProgress
        .map(progress =>
          courses?.find(course => course.id === progress.course_id)
        )
        .filter((course): course is NonNullable<typeof course> => !!course)
        .map(course => ({
          ...course,
          thumbnail_url: course.description || null,
        }));

      return sortedCourses;
    },
    enabled: !!user,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

// 최근 참여 스터디 조회
export const useRecentStudies = (limit: number = 6) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: dashboardKeys.recentStudies(limit),
    queryFn: async (): Promise<StudyInfo[]> => {
      if (!user) return [];

      const supabase = createClient();

      // 참여 중인 스터디 조회
      const { data: participations, error: participationsError } = await supabase
        .from('study_participants')
        .select(`
          study_id,
          role,
          joined_at,
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
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('joined_at', { ascending: false })
        .limit(limit);

      if (participationsError) throw participationsError;

      if (!participations?.length) return [];

      // Record<string, unknown> 타입으로 안전하게 처리
      const studies: StudyInfo[] = (participations as Record<string, unknown>[])
        .map((participation: Record<string, unknown>) => {
          // studies 필드 안전하게 추출
          const studiesField = participation.studies;
          
          // studies가 객체인지 확인
          if (!studiesField || typeof studiesField !== 'object' || studiesField === null) {
            return null;
          }
          
          const study = studiesField as Record<string, unknown>;

          // 필수 필드 검증
          if (!study.id || !study.title || !study.category) return null;

          // 안전한 타입 변환
          const id = String(study.id);
          const title = String(study.title);
          const category = String(study.category);
          const owner_id = String(study.owner_id ?? '');
          const max_participants = typeof study.max_participants === 'number' 
            ? study.max_participants 
            : Number(study.max_participants) || 0;
          const current_participants = typeof study.current_participants === 'number'
            ? study.current_participants
            : Number(study.current_participants) || 0;
          const start_date = String(study.start_date ?? '');
          const end_date = String(study.end_date ?? '');
          
          // status 타입 안전 변환
          let status: 'recruiting' | 'in_progress' | 'completed' = 'recruiting';
          if (study.status === 'recruiting' || study.status === 'in_progress' || study.status === 'completed') {
            status = study.status;
          }
          
          // role 타입 안전 변환
          let role: 'owner' | 'participant' = 'participant';
          if (participation.role === 'owner' || participation.role === 'participant') {
            role = participation.role;
          }

          return {
            id,
            title,
            category,
            owner_id,
            max_participants,
            current_participants,
            status,
            start_date,
            end_date,
            role,
          };
        })
        .filter((study): study is StudyInfo => study !== null);

      return studies;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
};

// 통합 대시보드 데이터 훅 (편의성을 위한 wrapper)
export const useDashboardData = () => {
  const enrollmentStats = useEnrollmentStats();
  const wishlistCount = useWishlistCount();
  const studyStats = useStudyStats();
  const lastActiveDate = useLastActiveDate();
  const completedLecturesCount = useCompletedLecturesCount();

  return {
    // 통합된 데이터
    data: {
      enrolledLecturesCount: enrollmentStats.data?.active || 0,
      completedLecturesCount: completedLecturesCount.data || 0,
      wishlistedCount: wishlistCount.data || 0,
      studyParticipationCount: studyStats.data?.participationCount || 0,
      studyCreatedCount: studyStats.data?.createdCount || 0,
      lastActiveDate: lastActiveDate.data,
      totalStudyTime: 0, // TODO: 향후 구현
      streakDays: 0, // TODO: 향후 구현
    } as DashboardSummary,
    
    // 통합된 로딩 상태
    isLoading: enrollmentStats.isLoading || 
               wishlistCount.isLoading || 
               studyStats.isLoading || 
               lastActiveDate.isLoading ||
               completedLecturesCount.isLoading,
    
    // 통합된 에러 상태  
    error: enrollmentStats.error || 
           wishlistCount.error || 
           studyStats.error || 
           lastActiveDate.error ||
           completedLecturesCount.error,
    
    // 개별 쿼리 상태 (필요시 접근)
    queries: {
      enrollment: enrollmentStats,
      wishlist: wishlistCount,
      study: studyStats,
      lastActive: lastActiveDate,
      completedLectures: completedLecturesCount,
    },
  };
};