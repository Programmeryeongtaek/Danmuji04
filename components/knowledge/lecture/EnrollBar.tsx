'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import LoginModal from '@/components/home/LoginModal';
import {
  useCancelEnrollment,
  useEnrollLecture,
  useEnrollmentStatus,
} from '@/hooks/api/useEnrollment';
import { userAtom } from '@/store/auth';

import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface EnrollBarProps {
  lectureId: number;
}

const EnrollBar = ({ lectureId }: EnrollBarProps) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [lectureInfo, setLectureInfo] = useState<{
    title: string;
    is_free: boolean;
    price: number;
  } | null>(null);

  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  const { data: enrollmentInfo, isLoading: enrollmentLoading } =
    useEnrollmentStatus(lectureId);
  const enrollMutation = useEnrollLecture();
  const cancelMutation = useCancelEnrollment();

  const isEnrolled = enrollmentInfo?.isEnrolled || false;
  const enrollmentStatus = enrollmentInfo?.status;

  useEffect(() => {
    const fetchLectureInfo = async () => {
      try {
        const supabase = createClient();

        const { data: lecture } = await supabase
          .from('lectures')
          .select('title, is_free, price')
          .eq('id', lectureId)
          .single();

        if (lecture) {
          setLectureInfo(lecture);
        }
      } catch (error) {
        console.error('Error fetching lecture info:', error);
      }
    };

    fetchLectureInfo();
  }, [lectureId]);

  const handleEnroll = async () => {
    if (!lectureId) {
      showToast('강의 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      setIsLoginModalOpen(true);
      return;
    }

    try {
      await enrollMutation.mutateAsync(lectureId);
      showToast('수강 신청이 완료되었습니다.', 'success');
    } catch (error) {
      console.error('수강 신청 실패:', error);
      const errorMessage =
        error instanceof Error ? error.message : '수강 신청에 실패했습니다.';
      showToast(errorMessage, 'error');
    }
  };

  const handleCancel = async () => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    try {
      await cancelMutation.mutateAsync(lectureId);
      showToast('수강 취소가 완료되었습니다.', 'success');
    } catch (error) {
      console.error('수강 취소 실패:', error);
      showToast('수강 취소에 실패했습니다.', 'error');
    }
  };

  const isLoading =
    enrollmentLoading || enrollMutation.isPending || cancelMutation.isPending;

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="sticky bottom-0 z-50 border-t bg-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <span className="ml-2 text-gray-600">처리 중...</span>
        </div>
      </div>
    );
  }

  // 수강 중일 때
  if (isEnrolled && enrollmentStatus === 'active') {
    return (
      <div className="sticky bottom-0 z-50 border-t bg-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            <span className="font-medium text-green-600">수강 중</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCancel} disabled={isLoading}>
              수강 취소
            </Button>
            <Link href={`/knowledge/lecture/${lectureId}/watch`}>
              <Button>학습 계속하기</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 수강 완료일 때
  if (isEnrolled && enrollmentStatus === 'completed') {
    return (
      <div className="sticky bottom-0 z-50 border-t bg-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-blue-500" />
            <span className="font-medium text-blue-600">수강 완료</span>
          </div>
          <Link href={`/knowledge/lecture/${lectureId}/watch`}>
            <Button>다시 보기</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 수강 전일 때
  return (
    <div className="sticky bottom-0 z-50 border-t bg-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          {lectureInfo?.is_free ? (
            <p className="text-lg font-bold text-green-600">무료</p>
          ) : (
            <p className="text-lg font-bold">
              ₩{lectureInfo?.price?.toLocaleString() || '0'}
            </p>
          )}
          <p className="text-sm text-gray-500">{lectureInfo?.title}</p>
        </div>
        <Button onClick={handleEnroll} disabled={isLoading}>
          수강 신청
        </Button>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};

export default EnrollBar;
