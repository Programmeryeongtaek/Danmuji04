'use client';

import { useEffect, useState } from 'react';
import EnrollBar from './EnrollBar';
import ReviewSection from './ReviewSection';
import { createClient } from '@/utils/supabase/client';
import { Lecture } from '@/types/knowledge/lecture';
import ShareButton from './ShareButton';
import BookmarkButton from './BookmarkButton';

interface LectureContentProps {
  lecture: Lecture;
}

export default function LectureContent({ lecture }: LectureContentProps) {
  const [currentUserId, setCurrentUserId] = useState('');
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);

        // 찜하기 상태 확인
        const { data: bookmark } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('lecture_id', lecture.id)
          .eq('user_id', user.id)
          .single();

        setIsBookmarked(!!bookmark);
      }

      // 수강평 개수와 평균 평점 가져오기
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('lecture_id', lecture.id);

      if (reviews) {
        const count = reviews.length;
        setReviewCount(count);

        if (count >= 5) {
          const total = reviews.reduce(
            (sum, review) => sum + (review?.rating || 0),
            0
          );
          const average = count > 0 ? total / count : 0;
          setAverageRating(Math.round(average * 10) / 10); // 소수점 첫째자리까지
        } else {
          setAverageRating(0);
        }
      }
    };

    loadData();
  }, [lecture.id]);

  return (
    <>
      <div className="min-h-screen bg-light">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* 메인 컨텐츠 */}
          <div className="rounded-lg border shadow-sm">
            {/* 영상 영역 */}
            <div className="flex justify-center border-b p-8">
              <div className="h-[300px] w-[500px] rounded-lg bg-gray-100">
                동영상 영역
              </div>
            </div>

            {/* 강의 정보 */}
            <div className="p-8">
              <div className="mb-4">
                <div className="mb-2 text-sm text-gray-600">
                  {lecture.category} / {lecture.depth}
                </div>
                <h1 className="mb-4 text-2xl font-bold">{lecture.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {reviewCount >= 5 ? (
                    <>
                      <span>★ {averageRating}</span>
                      <span>•</span>
                    </>
                  ) : (
                    <>
                      <span>★</span>
                      <span>평가전...</span>
                    </>
                  )}
                  <span>수강평 {reviewCount}개</span>
                  <span>•</span>
                  <span>수강생 {lecture.students}명</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{lecture.instructor}</div>
                  <div className="text-sm text-gray-600">{lecture.keyword}</div>
                </div>
                <div className="flex gap-2">
                  <BookmarkButton
                    lectureId={lecture.id}
                    initialIsBookmarked={isBookmarked}
                  />
                  <ShareButton lectureId={lecture.id} />
                </div>
              </div>
            </div>
          </div>

          {/* 강의 소개 */}
          <div className="mt-8 rounded-lg border p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">강의 소개</h2>
            <div>강의 소개 영역</div>
          </div>

          {/* 수강평 */}
          <div className="mt-8">
            <ReviewSection
              lectureId={lecture.id}
              currentUserId={currentUserId}
            />
          </div>
        </div>

        {/* 수강신청 바 */}
        <EnrollBar lectureId={Number(lecture.id)} />
      </div>
    </>
  );
}
