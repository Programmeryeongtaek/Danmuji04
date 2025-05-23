'use client';

import { useEffect, useState } from 'react';
import ReviewModal from './ReviewsModal';
import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { ToastType } from '@/components/common/Toast/type';
import { StarRating } from './StarRating';
import { ReviewList } from './ReviewList';
import { ReviewProps } from '@/app/types/knowledge/lecture';
import {
  deleteReview,
  fetchReviewsByLectureId,
} from '@/utils/services/knowledge/reviewService';
import {
  fetchAverageRating,
  getActiveEnrollment,
} from '@/utils/services/knowledge/lectureService';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';

interface ReviewSectionProps {
  lectureId: number;
  currentUserId?: string | null;
}

const ReviewSection = ({ lectureId, currentUserId }: ReviewSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviews, setReviews] = useState<ReviewProps[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const { showToast } = useToast();

  const user = useAtomValue(userAtom);

  // 데이터 불러오기
  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const [reviewsData, averageRating] = await Promise.all([
        fetchReviewsByLectureId(lectureId),
        fetchAverageRating(lectureId),
      ]);
      setReviews(reviewsData);
      setAverageRating(averageRating);

      // 로그인 상태라면 사용자의 리뷰 존재 여부와 수강 상태 확인
      if (user) {
        const supabase = createClient();

        // 리뷰 존재 여부 확인
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('lecture_id', lectureId)
          .eq('user_id', user.id)
          .maybeSingle();

        setHasExistingReview(!!existingReview);
      }
    } catch (error) {
      showToast('수강평을 불러오는데 실패했습니다.', error as ToastType);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [lectureId, user]);

  // reviews 상태 업데이트
  const handleDeleteReview = async (reviewId: number) => {
    try {
      await deleteReview(reviewId);
      loadReviews(); // 리뷰 목록 새로고침
    } catch (error) {
      console.error('Error deleting review:', error);
      showToast('수강평을 삭제하지 못했습니다.', 'error');
    }
  };

  // 수강평 작성 버튼
  const handleReviewButtonClick = async () => {
    if (!user?.id) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    if (hasExistingReview) {
      showToast('이미 수강평을 작성하였습니다.', 'error');
      return;
    }

    const supabase = createClient();

    try {
      // 1. 수강 여부 확인
      const { data: enrollment } = await getActiveEnrollment(
        lectureId,
        user.id
      );

      if (!enrollment?.status) {
        showToast('수강생만 수강평을 작성할 수 있습니다.', 'error');
        return;
      }

      // 2. 기존 수강평 확인
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('lecture_id', lectureId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (existingReview) {
        showToast('이미 수강평을 작성하였습니다.', 'error');
        return;
      }

      // 3. 모든 조건 통과시 모달 열기
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error checking review status:', error);
      showToast('오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
    
    setIsModalOpen(true);
  };

  return (
    <div className="mb-12 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <div className="flex gap-1">
            <h3 className="text-xl font-bold text-gray-800">수강평</h3>
            <span className="text-gray-600">{reviews.length}개</span>
          </div>
          <Button
            onClick={handleReviewButtonClick}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1 hover:from-purple-600 hover:to-indigo-700"
          >
            <span>작성</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 border-b pb-2">
          <StarRating rating={averageRating} readonly size={20} />
          <span className="font-medium">({averageRating.toFixed(1)})</span>
        </div>
      </div>

      {/* 수강평 목록 */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-purple-600"></div>
        </div>
      ) : reviews.length > 0 ? (
        <ReviewList
          reviews={reviews}
          currentUserId={user?.id || null}
          onDelete={handleDeleteReview}
        />
      ) : (
        <div className="flex justify-center py-8 text-gray-500">
          아직 수강평이 없습니다.
        </div>
      )}

      {/* 수강평 작성 모달 */}
      <ReviewModal
        lectureId={lectureId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={() => {
          loadReviews(); // 수강평 목록 새로고침
          setIsModalOpen(false);
          showToast('수강평이 등록되었습니다.', 'success');
        }}
      />
    </div>
  );
};

export default ReviewSection;
