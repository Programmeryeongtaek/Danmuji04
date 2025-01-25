'use client';

import { useEffect, useState } from 'react';
import EnrollBar from './EnrollBar';
import ReviewSection from './ReviewSection';
import { createClient } from '@/utils/supabase/client';
import { Lecture } from '@/types/knowledge/lecture';
import LikeButton from './LikeButton';
import ShareButton from './ShareButton';

interface LectureContentProps {
  lecture: Lecture;
}

export default function LectureContent({ lecture }: LectureContentProps) {
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  return (
    <>
      typescriptCopy
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
                  <span>좋아요 {lecture.likes}</span>
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
                  <LikeButton
                    lectureId={lecture.id}
                    initialLikeCount={lecture.likes}
                    initialIsLiked={false}
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
