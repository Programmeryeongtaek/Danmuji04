'use client';

import { CategoryProps } from '@/app/types/knowledge/lecture';
import {
  BookOpen,
  Brain,
  Search,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { MouseEvent, useEffect, useRef, useState } from 'react';

const categories = [
  { id: 'search', icon: Search, label: '검색' },
  { id: 'all', icon: BookOpen, label: '전체' },
  { id: 'humanities', icon: BookOpen, label: '인문학' },
  { id: 'philosophy', icon: Brain, label: '철학' },
  { id: 'psychology', icon: Brain, label: '심리학' },
  { id: 'economics', icon: TrendingUp, label: '경제학' },
  { id: 'self-development', icon: Target, label: '자기계발' },
  { id: 'leadership', icon: Users, label: '리더십' },
];

const Category = ({ selectedCategory, onCategoryClick }: CategoryProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // 선택된 카테고리가 화면에 보이도록 스크롤
  useEffect(() => {
    if (activeButtonRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeButton = activeButtonRef.current;

      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;
      const containerWidth = container.offsetWidth;
      const containerScrollLeft = container.scrollLeft;

      if (buttonLeft < containerScrollLeft) {
        container.scrollTo({
          left: buttonLeft - 16,
          behavior: 'smooth',
        });
      } else if (
        buttonLeft + buttonWidth >
        containerScrollLeft + containerWidth
      ) {
        container.scrollTo({
          left: buttonLeft + buttonWidth - containerWidth + 16,
          behavior: 'smooth',
        });
      }
    }
  }, [selectedCategory]);

  const handleCategoryClick = (categoryId: string) => {
    // 이미 선택된 카테고리면 무시
    if (categoryId === selectedCategory) {
      return;
    }

    // 상태 업데이트만 실행 (URL은 부모에서 처리)
    onCategoryClick(categoryId);
  };

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current!.offsetLeft);
    setScrollLeft(scrollContainerRef.current!.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current!.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current!.scrollLeft = scrollLeft - walk;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current) {
      setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
      setScrollLeft(scrollContainerRef.current.scrollLeft);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;

    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div
      ref={scrollContainerRef}
      className="flex max-w-full cursor-grab overflow-x-auto [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden"
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {categories.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          ref={selectedCategory === id ? activeButtonRef : null}
          onClick={() => handleCategoryClick(id)}
          className={`flex min-w-[80px] select-none flex-col items-center justify-center py-4 ${
            selectedCategory === id
              ? 'border-b-2 border-gold-start text-gold-start'
              : 'text-gray-700 hover:text-gold-start'
          }`}
        >
          <Icon className="mb-1 h-6 w-6" />
          <span className="whitespace-nowrap text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default Category;
