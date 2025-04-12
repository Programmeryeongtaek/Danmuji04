'use client';

import LectureSection from '@/components/knowledge/LectureSection';
import Category from '@/components/knowledge/Category';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const KnowledgePage = () => {
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
    <div>
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
};

export default KnowledgePage;
