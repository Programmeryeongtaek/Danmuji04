import CommunitySearchPageContent from '@/components/community/CommunitySearchPageContent';
import { Suspense } from 'react';

export default function SearchPage() {
  return (
    <>
      <Suspense fallback={<div>로딩 중...</div>}>
        <CommunitySearchPageContent />
      </Suspense>
    </>
  );
}
