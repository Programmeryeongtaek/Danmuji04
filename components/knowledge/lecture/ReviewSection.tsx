'use client';

import { useState } from 'react';
import ReviewModal from './ReviewsModal';
import Button from '@/components/common/Button/Button';

interface ReviewSectionProps {
  lectureId: number;
}

const ReviewSection = ({ lectureId }: ReviewSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col border border-black p-4">
      <div className="flex justify-between">
        <h3 className="text-xl font-bold">수강평</h3>
        <span>전체 00개</span>
      </div>
      <div className="mt-4 flex justify-between border-b border-t py-4">
        <span>수강평을 남겨주세요.</span>
        <Button onClick={() => setIsModalOpen(true)}>수강평 남기기</Button>
      </div>

      <ReviewModal
        lectureId={lectureId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={() => {
          // TODO: 수강평 목록 새로고침
          setIsModalOpen(false);
        }}
      />

      {/* 수강평 목록 */}
      <div className="mt-4">{/* TODO: 수강평 데이터 불러오기 및 표시 */}</div>
    </div>
  );
};

export default ReviewSection;
