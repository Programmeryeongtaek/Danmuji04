'use client';

import { ReviewListProps } from '@/types/knowledge/lecture';
import { ReviewItem } from './ReviewItem';

export function ReviewList({ reviews, currentUserId }: ReviewListProps) {
  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
