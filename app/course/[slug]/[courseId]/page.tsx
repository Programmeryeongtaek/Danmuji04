import CourseDetail from '@/components/Course/category/CourseDetail';
import { Suspense } from 'react';

interface CourseDetailPageProps {
  params: {
    slug: string;
    courseId: string;
  };
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug, courseId } = params;

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          로딩 중...
        </div>
      }
    >
      <CourseDetail courseId={courseId} category={slug} />
    </Suspense>
  );
}
