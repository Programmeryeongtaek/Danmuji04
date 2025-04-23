import MyStudiesPageContent from '@/components/My/MyStudiesPageContent';
import { Suspense } from 'react';

export default function MyStudiesPage() {
  return (
    <>
      <Suspense fallback={<div>로딩 중...</div>}>
        <MyStudiesPageContent />
      </Suspense>
    </>
  );
}
