'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Category from './Category';
import LectureSection from './LectureSection';

export default function KnowledgePageContent() {
  const searchParams = useSearchParams();
  const queryCategory = searchParams.get('category');
  const searchQuery = searchParams.get('q');

  const [selectedCategory, setSelectedCategory] = useState(
    queryCategory || 'all'
  );

  // URL 파라미터가 변경되면 카테고리 업데이트
  useEffect(() => {
    if (queryCategory) {
      setSelectedCategory(queryCategory);
    }
  }, [queryCategory]);

  return (
    <div className="flex flex-col gap-6">
      <Category
        selectedCategory={selectedCategory}
        onCategoryClick={setSelectedCategory}
      />

      <LectureSection
        selectedCategory={selectedCategory}
        searchQuery={searchQuery || ''}
      />
    </div>
  );
}
