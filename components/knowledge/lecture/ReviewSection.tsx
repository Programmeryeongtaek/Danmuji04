'use client';

import { useEffect, useState } from 'react';
import ReviewModal from './ReviewsModal';
import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import {
  fetchAverageRating,
  fetchReviewsByLectureId,
} from '@/utils/supabase/client';
import { ToastType } from '@/components/common/Toast/type';
import { StarRating } from './StarRating';
import { ReviewList } from './ReviewList';

interface ReviewSectionProps {
  lectureId: number;
}

const ReviewSection = ({ lectureId }: ReviewSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
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
        <Button onClick={() => setIsModalOpen(true)}>수강평 남기기</Button>
      </div>

      {/* 수강평 목록 */}
      {isLoading ? (
        <div>
          <span>로딩 중...</span>
        </div>
      ) : reviews.length > 0 ? (
        <ReviewList reviews={reviews} />
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
