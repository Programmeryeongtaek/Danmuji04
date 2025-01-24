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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error, data } = await getActiveEnrollment(lectureId, user.id);
      if (error || !data?.status) {
        showToast('수강생만 수강평을 작성할 수 있습니다.', 'error');
        return;
      }

      setIsModalOpen(true);
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, 'error');
      }
    }
  };

  return (
    <div className="flex flex-col border border-black p-4">
      <div className="flex justify-between">
        <h3 className="text-xl font-bold">수강평</h3>
        <div className="">
          <StarRating rating={averageRating} readonly size={20} />
          <span>({averageRating.toFixed(1)})</span>
          <span>{reviews.length}개</span>
        </div>
      </div>
      <div className="mt-4 flex justify-between border-b border-t py-4">
        <span>수강평을 남겨주세요.</span>
        <Button onClick={handleReviewButtonClick}>수강평 남기기</Button>
      </div>

      {/* 수강평 목록 */}
      {isLoading ? (
        <div>
          <span>로딩 중...</span>
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
      <div className="mt-4">{/* TODO: 수강평 데이터 불러오기 및 표시 */}</div>

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
