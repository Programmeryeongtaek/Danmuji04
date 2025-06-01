'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import LoginModal from '@/components/home/LoginModal';
import { userAtom } from '@/store/auth';
import {
  enrollLecture,
  getActiveEnrollment,
} from '@/utils/services/knowledge/lectureService';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface EnrollBarProps {
  lectureId: number;
}

type EnrollmentStatus = 'active' | 'cancelled' | null;

const EnrollBar = ({ lectureId }: EnrollBarProps) => {
  const [enrollmentStatus, setEnrollmentStatus] =
    useState<EnrollmentStatus>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [lectureInfo, setLectureInfo] = useState<{
    title: string;
    is_free: boolean;
    price: number;
  } | null>(null);

  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const supabase = createClient();

        // 강의 정보 가져오기
        const { data: lecture } = await supabase
          .from('lectures')
          .select('title, is_free, price')
          .eq('id', lectureId)
          .single();

        if (lecture) {
          setLectureInfo(lecture);
        }

        // 로그인한 경우에만 수강 상태 확인
        if (user) {
          const response = await getActiveEnrollment(lectureId, user.id);
          if (!response.error && response.data) {
            setEnrollmentStatus(response.data.status as EnrollmentStatus);
          } else {
            setEnrollmentStatus(null);
          }
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
        setEnrollmentStatus(null);
      }
    };

    checkEnrollment();
  }, [lectureId, user]);

  const handleEnroll = async () => {
    if (!lectureId) {
      showToast('강의 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    // 로그인 여부 확인
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      setIsLoginModalOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      await enrollLecture(Number(lectureId));

      if (user) {
        const response = await getActiveEnrollment(Number(lectureId), user.id);
        if (!response.error && response.data) {
          setEnrollmentStatus(response.data.status as EnrollmentStatus);
          showToast('수강 신청이 완료되었습니다.', 'success');
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-light shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex flex-col">
            <span className="font-medium">{lectureInfo?.title || '강의'}</span>
            <span className="text-sm text-gray-500">
              {enrollmentStatus === 'active' ? (
                <span className="flex items-center text-purple-600">
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

          <Button
            onClick={enrollmentStatus === 'active' ? undefined : handleEnroll}
            disabled={enrollmentStatus !== 'active' && isLoading}
            className={`flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3 text-white transition-all hover:from-purple-600 hover:to-indigo-700 ${
              enrollmentStatus !== 'active' && isLoading ? 'bg-gray-400' : ''
            }`}
          >
            {enrollmentStatus === 'active' ? (
              <Link href={`/knowledge/lecture/${lectureId}/watch`}>
                학습하기
              </Link>
            ) : (
              '수강신청'
            )}
          </Button>
        </div>
      </div>

      {/* 로그인 모달 */}
      <LoginModal isOpen={isLoginModalOpen} onClose={handleCloseLoginModal} />
    </>
  );
};

export default EnrollBar;
