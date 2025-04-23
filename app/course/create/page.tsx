import CourseCreatePageContent from '@/components/Course/CourseCreatePageContent';
import { Suspense } from 'react';

export default function CourseCreatePage() {
  return (
    <>
      <Suspense fallback={<div>로딩 중...</div>}>
        <CourseCreatePageContent />
      </Suspense>
    </>
  );
}
