import CourseLearnContent from '@/components/Course/learn/CourseLearnContent';
import { Suspense } from 'react';

interface CourseLearnPageProps {
  params: {
    slug: string;
    courseId: string;
    itemId: string;
  };
}

export default async function CourseLearnPage({
  params,
}: CourseLearnPageProps) {
  // async 함수에서 params를 await 해서 사용
  const { slug, courseId, itemId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="animate-pulse text-lg">로딩 중...</div>
        </div>
      }
    >
      <CourseLearnContent courseId={courseId} itemId={itemId} category={slug} />
    </Suspense>
  );
}
