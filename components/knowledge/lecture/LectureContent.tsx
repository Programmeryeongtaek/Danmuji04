'use client';

import { useEffect, useState } from 'react';
import EnrollBar from './EnrollBar';
import ReviewSection from './ReviewSection';
import { createClient } from '@/utils/supabase/client';
import { Lecture } from '@/types/knowledge/lecture';

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
      <div className="min-h-screen bg-light">
        <div className="h-[525px] w-full border border-black px-4 py-8">
          {/* ... 기존 JSX ... */}
        </div>
        <div>강의 소개 영역</div>
        <ReviewSection lectureId={lecture.id} currentUserId={currentUserId} />
      </div>
      <EnrollBar lectureId={Number(lecture.id)} />
    </>
  );
}
