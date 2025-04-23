import CourseLearnContent from '@/components/Course/learn/CourseLearnContent';
import { Suspense } from 'react';

type Params = Promise<{ slug: string; courseId: string; itemId: string }>;

export default async function CourseLearnPage(props: { params: Params }) {
  const params = await props.params;
  const { slug, courseId, itemId } = params;

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
