import CourseLearnContent from '@/components/Course/learn/CourseLearnContent';
import { Suspense } from 'react';

interface CourseLearnPageProps {
  params: {
    slug: string;
    courseId: string;
    itemId: string;
  };
}

export default function CourseLearnPage({ params }: CourseLearnPageProps) {
  const { slug, courseId, itemId } = params;

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          로딩 중...
        </div>
      }
    >
      <CourseLearnContent courseId={courseId} itemId={itemId} category={slug} />
    </Suspense>
  );
}
