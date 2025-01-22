'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import {
  createClient,
  enrollLecture,
  getActiveEnrollment,
} from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

interface EnrollBarProps {
  lectureId: number;
}

type EnrollmentStatus = 'active' | 'cancelled' | null;

const EnrollBar = ({ lectureId }: EnrollBarProps) => {
  const [enrollmentStatus, setEnrollmentStatus] =
    useState<EnrollmentStatus>(null);
  const [isLoading, setIsLoading] = useState(false);
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
      await enrollLecture(Number(lectureId)); // lectureId를 number로 확실하게 변환
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setEnrollmentStatus(null);
        return;
      }

      const response = await getActiveEnrollment(Number(lectureId), user.id);
      if (!response.error && response.data) {
        setEnrollmentStatus(response.data.status as EnrollmentStatus);
      }

      showToast('수강 신청이 완료되었습니다.', 'success');
    } catch (err) {
      console.error('Enrollment error:', err); // 상세 에러 확인용
      if (err instanceof Error) {
        showToast(err.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span>{enrollmentStatus === 'active' ? '학습 중' : '학습 전'}</span>
        <Button
          onClick={handleEnroll}
          disabled={isLoading || enrollmentStatus === 'active'}
        >
          {isLoading
            ? '처리 중...'
            : enrollmentStatus === 'active'
              ? '계속 학습하기'
              : '수강 신청하기'}
        </Button>
      </div>
    </div>
  );
};

export default EnrollBar;
