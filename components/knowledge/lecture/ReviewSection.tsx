'use client';

import { useEffect, useState } from 'react';
import ReviewModal from './ReviewsModal';
import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import {
  createClient,
  deleteReview,
  fetchAverageRating,
  fetchReviewsByLectureId,
  getActiveEnrollment,
} from '@/utils/supabase/client';
import { ToastType } from '@/components/common/Toast/type';
import { StarRating } from './StarRating';
import { ReviewList } from './ReviewList';
import { ReviewProps } from '@/types/knowledge/lecture';

interface ReviewSectionProps {
  lectureId: number;
  currentUserId: string;
}

const ReviewSection = ({ lectureId, currentUserId }: ReviewSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviews, setReviews] = useState<ReviewProps[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

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
    } catch (error) {
      showToast('수강평을 불러오는데 실패했습니다.', error as ToastType);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [lectureId]);

  // reviews 상태 업데이트
  const handleDeleteReview = async (reviewId: number) => {
    try {
      await deleteReview(reviewId, currentUserId);
      loadReviews(); // 리뷰 목록 새로고침
    } catch (error) {
      console.error('Error deleting review:', error);
      showToast('수강평을 삭제하지 못했습니다.', error as ToastType);
    }
  };

  // 수강평 작성 버튼
  const handleReviewButtonClick = async () => {
    if (!currentUserId) {
      showToast('로그인이 필요합니다.', 'warning' as ToastType);
      return;
    }

    const supabase = createClient();

    try {
      // 1. 수강 여부 확인
      const { data: enrollment } = await getActiveEnrollment(
        lectureId,
        currentUserId
      );

      if (!enrollment?.status) {
        showToast(
          '수강생만 수강평을 작성할 수 있습니다.',
          'warning' as ToastType
        );
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
        showToast('이미 수강평을 작성하였습니다.', 'warning' as ToastType);
        return;
      }

      // 3. 모든 조건 통과시 모달 열기
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error checking review status:', error);
      showToast(
        '오류가 발생했습니다. 다시 시도해주세요.',
        'error' as ToastType
      );
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800">수강평</h3>
        <div className="flex items-center gap-2">
          <StarRating rating={averageRating} readonly size={20} />
          <span className="font-medium">({averageRating.toFixed(1)})</span>
          <span className="text-gray-600">{reviews.length}개</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-b border-t border-gray-200 py-4">
        <span className="text-gray-600">수강평을 남겨주세요.</span>
        <Button onClick={handleReviewButtonClick}>
          <span>수강평 남기기</span>
        </Button>
      </div>

      {/* 수강평 목록 */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-purple-600"></div>
        </div>
      ) : reviews.length > 0 ? (
        <ReviewList
          reviews={reviews}
          currentUserId={currentUserId}
          onDelete={handleDeleteReview}
        />
      ) : (
        <div className="flex justify-center py-8 text-gray-500">
          아직 수강평이 없습니다.
        </div>
      )}

      <ReviewModal
        lectureId={lectureId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={() => {
          loadReviews(); // 수강평 목록 새로고침
          setIsModalOpen(false);
          showToast('수강평이 등록되었습니다.', 'success' as ToastType);
        }}
      />
    </div>
  );
};

export default ReviewSection;
