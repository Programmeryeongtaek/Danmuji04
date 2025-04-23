import CreateStudyPageContent from '@/components/study/CreateStudyPageContent';
import { Suspense } from 'react';

export default function CreateStudyPage() {
  return (
    <>
      <Suspense fallback={<div>로딩 중...</div>}>
        <CreateStudyPageContent />
      </Suspense>
    </>
  );
}
