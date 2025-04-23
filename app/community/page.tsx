import CommunityPageContent from '@/components/community/CommunityPageContent';
import { Suspense } from 'react';

export default function CommunityPage() {
  return (
    <>
      <Suspense fallback={<div>로딩 중...</div>}>
        <CommunityPageContent />
      </Suspense>
    </>
  );
}
