'use client';

import Card from '@/components/common/Card';
import CancelEnrollmentButton from '@/components/My/CancelEnrollmentButton';
import { useToast } from '@/components/common/Toast/Context';
import { Lecture } from '@/app/types/knowledge/lecture';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { calculateEnrollmentProgress } from '@/utils/services/knowledge/lectureWatchService';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';
import {
  useCancelEnrollment,
  useEnrollmentList,
} from '@/hooks/api/useEnrollment';

interface EnrolledLecture extends Lecture {
  enrollment_status: 'active' | 'cancelled';
  progress: number;
  enrolled_at?: string;
}

export default function MyLearningPage() {
  const [enrolledLectures, setEnrolledLectures] = useState<EnrolledLecture[]>(
    []
  );
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  const { data: enrollments, isLoading: enrollmentsLoading } =
    useEnrollmentList();
  const cancelMutation = useCancelEnrollment();

  useEffect(() => {
    const loadLecturesWithProgress = async () => {
      if (!enrollments || !user || enrollments.length === 0) {
        setEnrolledLectures([]);
        setIsLoadingProgress(false);
        return;
      }

      setIsLoadingProgress(true);
      try {
        const supabase = createClient();

        // 활성 수강신청만 필터링
        const activeEnrollments = enrollments.filter(
          (e) => e.status === 'active'
        );

        if (activeEnrollments.length === 0) {
          setEnrolledLectures([]);
          setIsLoadingProgress(false);
          return;
        }

        const lectureIds = activeEnrollments.map((e) => e.lecture_id);

        // 강의 상세 정보 가져오기
        const { data: lectures, error: lecturesError } = await supabase
          .from('lectures')
          .select('*')
          .in('id', lectureIds);

        if (lecturesError) {
          console.error('강의 정보 조회 에러:', lecturesError);
          showToast('강의 정보를 불러오는데 실패했습니다.', 'error');
          setEnrolledLectures([]);
          setIsLoadingProgress(false);
          return;
        }

        if (!lectures || lectures.length === 0) {
          setEnrolledLectures([]);
          setIsLoadingProgress(false);
          return;
        }

        // 각 강의의 진행률 계산 - 개별 에러 처리
        const lecturesWithProgress = await Promise.all(
          lectures.map(async (lecture) => {
            let progress = 0;
            try {
              progress = await calculateEnrollmentProgress(lecture.id, user.id);
            } catch (error) {
              console.warn(`강의 ${lecture.id}의 진행률 계산 중 오류:`, error);
              // 진행률 계산 실패 시 0으로 설정
              progress = 0;
            }

            const enrollment = activeEnrollments.find(
              (e) => e.lecture_id === lecture.id
            );

            return {
              ...lecture,
              enrollment_status:
                (enrollment?.status as 'active' | 'cancelled') || 'cancelled',
              progress: Math.round(progress),
              enrolled_at: enrollment?.enrolled_at || '',
            } as EnrolledLecture;
          })
        );

        setEnrolledLectures(lecturesWithProgress);
      } catch (error) {
        console.error('수강 강의 목록 로드 실패:', error);
        showToast('수강 중인 강의 목록을 불러오는데 실패했습니다.', 'error');
        setEnrolledLectures([]);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadLecturesWithProgress();
  }, [enrollments, user, showToast]);

  const handleCancelEnrollment = async (lectureId: number) => {
    try {
      await cancelMutation.mutateAsync(lectureId);
      showToast('수강 취소가 완료되었습니다.', 'success');

      // 로컬 상태에서 해당 강의 제거
      setEnrolledLectures((prev) =>
        prev.filter((lecture) => lecture.id !== lectureId)
      );
    } catch (error) {
      console.error('수강 취소 실패:', error);
      showToast('수강 취소에 실패했습니다.', 'error');
    }
  };

  const isLoading = enrollmentsLoading || isLoadingProgress;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="mb-8 text-2xl font-bold">학습 현황</h1>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            <span className="ml-2 text-gray-600">
              수강 정보를 불러오는 중...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-8 text-2xl font-bold">학습 현황</h1>

      {enrolledLectures.length > 0 ? (
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">수강 중인 강의</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {enrolledLectures.map((lecture) => (
                <div key={lecture.id} className="flex flex-col">
                  <Card {...lecture} showBookmark={false} />
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>수강율</span>
                      <span
                        className={
                          lecture.progress >= 20
                            ? 'font-medium text-green-600'
                            : ''
                        }
                      >
                        {lecture.progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full ${
                          lecture.progress >= 20
                            ? 'bg-green-500'
                            : 'bg-gold-start'
                        }`}
                        style={{ width: `${lecture.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/knowledge/lecture/${lecture.id}/watch`}
                        className="mt-2 block rounded-lg bg-gold-start px-4 py-2 text-center text-white"
                        prefetch={false}
                      >
                        학습하기
                      </Link>
                      {lecture.progress < 20 ? (
                        <CancelEnrollmentButton
                          lectureId={lecture.id}
                          progress={lecture.progress}
                          onCancelSuccess={() =>
                            handleCancelEnrollment(lecture.id)
                          }
                        />
                      ) : (
                        <button
                          onClick={() =>
                            showToast(
                              '수강률이 20% 이상이므로 수강 취소가 불가능합니다.',
                              'error'
                            )
                          }
                          className="cursor-not-allowed text-sm text-red-500 opacity-50"
                          title="수강률이 20% 이상인 강의는 취소할 수 없습니다"
                          style={{ cursor: 'not-allowed' }}
                        >
                          수강 취소
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center">
          <p className="mb-4 text-gray-500">수강 중인 강의가 없습니다.</p>
          <Link
            href="/knowledge"
            className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white hover:opacity-90"
          >
            강의 둘러보기
          </Link>
        </div>
      )}
    </div>
  );
}
