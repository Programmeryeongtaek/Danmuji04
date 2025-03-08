'use client';

import { useEffect, useState } from 'react';
import EnrollBar from './EnrollBar';
import ReviewSection from './ReviewSection';
import { createClient } from '@/utils/supabase/client';
import { Lecture } from '@/types/knowledge/lecture';
import ShareButton from './ShareButton';
import BookmarkButton from './BookmarkButton';
import Link from 'next/link';
import { Play } from 'lucide-react';

interface LectureContentProps {
  lecture: Lecture;
}

export default function LectureContent({ lecture }: LectureContentProps) {
  const [currentUserId, setCurrentUserId] = useState('');
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const loadUserAndReviewData = async () => {
      try {
        const supabase = createClient();

        // 1. 사용자 인증 확인
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;

        // 2. 로그인한 경우에만 북마크 확인
        if (user) {
          setCurrentUserId(user.id);

          const { data: bookmark } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('lecture_id', lecture.id)
            .eq('user_id', user.id)
            .maybeSingle();

          setIsBookmarked(!!bookmark);
        }

        // 3. 수강평 정보 조회
        const { data: reviews, error: reviewError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('lecture_id', lecture.id);

        if (reviewError) throw reviewError;

        if (reviews) {
          const count = reviews.length;
          setReviewCount(count);

          if (count >= 5) {
            const total = reviews.reduce(
              (sum, review) => sum + (review?.rating || 0),
              0
            );
            const average = total / count;
            setAverageRating(Math.round(average * 10) / 10);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadUserAndReviewData();
  }, [lecture.id]);

  return (
    <>
      <div className="min-h-screen bg-light">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* 메인 컨텐츠 */}
          <div className="rounded-lg border shadow-sm">
            {/* 영상 영역 */}
            <div className="flex justify-center border-b p-8">
              <Link
                href={`/knowledge/lecture/${lecture.id}/watch`}
                className="cursor-pointer"
              >
                <div className="flex h-[300px] w-[500px] items-center justify-center rounded-lg bg-gray-100">
                  <Play className="h-16 w-16 text-gray-500 hover:text-blue-500" />
                </div>
              </Link>
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
                {currentUserId && (
                  <div className="flex gap-2">
                    <BookmarkButton
                      lectureId={lecture.id}
                      initialIsBookmarked={isBookmarked}
                    />
                    <ShareButton lectureId={lecture.id} />
                  </div>
                )}
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

        {/* 수강신청 바는 로그인한 사용자에게만 표시 */}
        {currentUserId && <EnrollBar lectureId={Number(lecture.id)} />}
      </div>
    </>
  );
}
