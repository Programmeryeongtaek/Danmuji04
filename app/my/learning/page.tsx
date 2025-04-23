'use client';

import Card from '@/components/common/Card';
import CancelEnrollmentButton from '@/components/My/CancelEnrollmentButton';
import { useToast } from '@/components/common/Toast/Context';
import { ToastType } from '@/components/common/Toast/type';
import { Lecture } from '@/app/types/knowledge/lecture';
import {
  calculateEnrollmentProgress,
  createClient,
} from '@/utils/supabase/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface EnrolledLecture extends Lecture {
  enrollment_status: 'active' | 'cancelled';
  progress: number;
}

export default function MyLearningPage() {
  const [enrolledLectures, setEnrolledLectures] = useState<EnrolledLecture[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadEnrolledLectures = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast('로그인이 필요합니다.', 'warning' as ToastType);
        return;
      }

      // 1. 사용자의 수강신청 정보 가져오기
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('lecture_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (enrollmentsError) throw enrollmentsError;
      if (!enrollments || enrollments.length === 0) {
        setIsLoading(false);
        return;
      }

      // 2. 강의 ID 리스트 만들기
      const lectureIds = enrollments.map((enrollment) => enrollment.lecture_id);

      // 3. 강의 상세 정보 가져오기
      const { data: lectures, error: lecturesError } = await supabase
        .from('lectures')
        .select('*')
        .in('id', lectureIds);

      if (lecturesError) throw lecturesError;

      // 4. 각 강의의 진행률 계산
      const lecturesWithProgress = await Promise.all(
        lectures.map(async (lecture) => {
          const progress = await calculateEnrollmentProgress(
            lecture.id,
            user.id
          );
          const enrollment = enrollments.find(
            (e) => e.lecture_id === lecture.id
          );

          return {
            ...lecture,
            enrollment_status: enrollment?.status || 'cancelled',
            progress: Math.round(progress), // 진행률 반올림
          };
        })
      );

      setEnrolledLectures(lecturesWithProgress);
    } catch (error) {
      console.error('수강 중인 강의 목록을 불러오는데 실패했습니다.', error);
      showToast(
        '수강 중인 강의 목록을 불러오는데 실패했습니다.',
        'error' as ToastType
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEnrolledLectures();
  }, []);

  const handleCancelSuccess = () => {
    loadEnrolledLectures(); // 취소 성공 시 목록 새로고침
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">로딩 중...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-8 text-2xl font-bold">내 학습</h1>

      {enrolledLectures.length > 0 ? (
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">진행 중인 강의</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {enrolledLectures.map((lecture) => (
                <div key={lecture.id} className="flex flex-col">
                  <Card {...lecture} showBookmark={false} />
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>진도율</span>
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
                        prefetch={
                          false
                        } /* prefetch 비활성화 - 동적 데이터가 있는 페이지에서 유용 */
                      >
                        이어서 학습하기
                      </Link>
                      {lecture.progress < 20 ? (
                        <CancelEnrollmentButton
                          lectureId={lecture.id}
                          progress={lecture.progress}
                          onCancelSuccess={handleCancelSuccess}
                        />
                      ) : (
                        <button
                          onClick={() =>
                            showToast(
                              '수강률이 20% 이상이므로 수강 취소가 불가능합니다.',
                              'error' as ToastType
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
