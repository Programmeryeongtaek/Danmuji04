'use client';

import Button from '@/components/common/Button/Button';
import { WriteSectionProps } from '@/types/course/courseType';
import { useState } from 'react';

const WriteSection = ({ onSubmit }: WriteSectionProps) => {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    onSubmit?.(content);
  };

  return (
    <div>
      <h2>내용 및 생각 정리하기</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded border"
        placeholder="영상의 내용과 생각을 정리해보세요."
      />
      <Button onClick={handleSubmit}>저장하기</Button>
    </div>
  );
};

export default WriteSection;
