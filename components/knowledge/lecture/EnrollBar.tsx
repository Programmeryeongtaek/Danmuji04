'use client';

import { useToast } from '@/components/common/Toast/Context';
import {
  createClient,
  enrollLecture,
  getActiveEnrollment,
} from '@/utils/supabase/client';
import { BookOpen, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EnrollBarProps {
  lectureId: number;
}

type EnrollmentStatus = 'active' | 'cancelled' | null;

const EnrollBar = ({ lectureId }: EnrollBarProps) => {
  const [enrollmentStatus, setEnrollmentStatus] =
    useState<EnrollmentStatus>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lectureInfo, setLectureInfo] = useState<{
    title: string;
    is_free: boolean;
    price: number;
  } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setEnrollmentStatus(null);
          return;
        }

        // 강의 정보 가져오기
        const { data: lecture } = await supabase
          .from('lectures')
          .select('title, is_free, price')
          .eq('id', lectureId)
          .single();

        if (lecture) {
          setLectureInfo(lecture);
        }

        const response = await getActiveEnrollment(lectureId, user.id);
        if (response.error) {
          setEnrollmentStatus(null);
          return;
        }

        // data가 null이 아닌 경우에만 status에 접근
        setEnrollmentStatus(
          response.data ? (response.data.status as EnrollmentStatus) : null
        );
      } catch (error) {
        console.error('Error checking enrollment:', error);
        setEnrollmentStatus(null);
      }
    };

    checkEnrollment();
  }, [lectureId]);

  const handleEnroll = async () => {
    if (!lectureId) {
      showToast('강의 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setEnrollmentStatus(null);
        showToast('로그인이 필요합니다.', 'error');
        return;
      }

      await enrollLecture(Number(lectureId));
      const response = await getActiveEnrollment(Number(lectureId), user.id);
      if (!response.error && response.data) {
        setEnrollmentStatus(response.data.status as EnrollmentStatus);
        showToast('수강 신청이 완료되었습니다.', 'success');
      }
    } catch (err) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-col">
          <span className="font-medium">{lectureInfo?.title || '강의'}</span>
          <span className="text-sm text-gray-500">
            {enrollmentStatus === 'active' ? (
              <span className="flex items-center text-green-600">
                <CheckCircle className="mr-1 h-4 w-4" />
                학습 중
              </span>
            ) : (
              <span>
                {lectureInfo?.is_free
                  ? '무료'
                  : `${lectureInfo?.price?.toLocaleString() || 0}원`}
              </span>
            )}
          </span>
        </div>

        <button
          onClick={handleEnroll}
          disabled={isLoading || enrollmentStatus === 'active'}
          className={`flex items-center gap-2 rounded-lg px-6 py-3 text-white transition-all ${
            isLoading
              ? 'bg-gray-400'
              : enrollmentStatus === 'active'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
          }`}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>처리 중...</span>
            </>
          ) : enrollmentStatus === 'active' ? (
            <>
              <BookOpen className="h-5 w-5" />
              <span>계속 학습하기</span>
            </>
          ) : (
            <span>수강 신청하기</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default EnrollBar;
