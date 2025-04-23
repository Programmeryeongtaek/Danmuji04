import { Suspense } from 'react';
import KnowledgePageContent from '@/components/knowledge/KnowledgePageContent';

const KnowledgePage = () => {
  return (
    <>
      <Suspense fallback={<div>로딩 중...</div>}>
        <KnowledgePageContent />
      </Suspense>
    </>
  );
};

export default KnowledgePage;
