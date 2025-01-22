'use client';

import { formatDistanceToNow } from 'date-fns';
import { StarRating } from './StarRating';
import { ko } from 'date-fns/locale';
import Image from 'next/image';

interface ReviewProps {
  id: number;
  rating: number;
  content: string;
  created_at: string;
  user_id: string;
  lecture_id: number;
  user_profile?: {
    id: string;
    user_name: string;
    avatar_url: string | null;
  } | null;
}

interface ReviewListProps {
  reviews: ReviewProps[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border-b pb-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
              {review.user_profile?.avatar_url ? (
                <Image
                  src={review.user_profile.avatar_url}
                  alt={review.user_profile.user_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-300 text-gray-500">
                  {review.user_profile?.user_name?.[0] ?? '?'}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">
                    {review.user_profile?.user_name ?? '익명'}
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size={16} readonly />
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-gray-700">{review.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
