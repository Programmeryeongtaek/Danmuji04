import StudyPageContent from '@/components/study/StudyPageContent';
import { Suspense } from 'react';

export default function StudyPage() {
  return (
    <>
      <Suspense fallback={<div>로딩 중...</div>}>
        <StudyPageContent />
      </Suspense>
    </>
  );
}
