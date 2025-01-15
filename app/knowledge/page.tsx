'use client';

import LectureSection from '@/components/knowledge/LectureSection';
import Category from '@/components/knowledge/Category';
import { useState } from 'react';

const KnowledgePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  return (
    <div>
      <Category
        selectedCategory={selectedCategory}
        onCategoryClick={setSelectedCategory}
      />
      <LectureSection selectedCategory={selectedCategory} />
    </div>
  );
};

export default KnowledgePage;
