'use client';

import { ReviewListProps } from '@/types/knowledge/lecture';
import { ReviewItem } from './ReviewItem';

export function ReviewList({
  reviews,
  currentUserId,
  onDelete,
}: ReviewListProps) {
  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          currentUserId={currentUserId}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
