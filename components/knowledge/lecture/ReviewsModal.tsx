'use client';

import { createClient } from '@/utils/supabase/client';
import { Star } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface ReviewModalProps {
  lectureId: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

const ReviewModal = ({
  lectureId,
  isOpen,
  onClose,
  onSubmit,
}: ReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    const { error } = await supabase.from('reviews').insert([
      {
        lecture_id: lectureId,
        rating,
        content,
      },
    ]);

    if (!error) {
      onSubmit();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[500px] rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">수강평 작성</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="mb-2">평점</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-colors"
                >
                  <Star
                    className={
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="h-32 w-full rounded border p-2"
              placeholder="수강평을 작성해주세요"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              작성하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
