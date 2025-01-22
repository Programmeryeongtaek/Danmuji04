'use client';

import { formatDistanceToNow } from 'date-fns';
import { StarRating } from './StarRating';
import { ko } from 'date-fns/locale';

interface ReviewProps {
  id: number;
  rating: number;
  content: string;
  createdAt: string;
  profiles: {
    id: string;
    role: string;
  };
}

interface ReviewListProps {
  reviews: ReviewProps[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size={16} readonly />
              <span className="text-sm text-gray-600">
                {formatDistanceToNow(new Date(review.createdAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>
          </div>
          <p className="mt-2 text-gray-700">{review.content}</p>
        </div>
      ))}
    </div>
  );
}
