'use client';

import {
  BookOpen,
  Brain,
  Search,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { MouseEvent, useRef, useState } from 'react';

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

const Category = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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

  return (
    <div
      ref={scrollContainerRef}
      className="flex max-w-full cursor-grab overflow-x-auto [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden"
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {categories.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setSelectedCategory(id)}
          className={`flex min-w-[80px] select-none flex-col items-center justify-center py-4 ${
            selectedCategory === id
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500 hover:text-gray-700'
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
