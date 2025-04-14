'use client';

import { CategoryProps } from '@/types/knowledge/lecture';
import {
  BookOpen,
  Brain,
  Search,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();

  // URL에 검색 파라미터가 있으면 검색 카테고리 활성화
  useEffect(() => {
    if (searchParams.get('q')) {
      onCategoryClick('search');
    }
  }, [searchParams, onCategoryClick]);

  // URL에서 카테고리 파라미터 확인
  useEffect(() => {
    const categoryParams = searchParams.get('category');
    if (categoryParams && categoryParams !== selectedCategory) {
      onCategoryClick(categoryParams);
    }
  }, [searchParams, selectedCategory, onCategoryClick]);

  // 선택된 카테고리가 화면에 보이도록 스크롤
  useEffect(() => {
    if (activeButtonRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeButton = activeButtonRef.current;

      // 활성화된 버튼이 컨테이너의 시야에 완전히 들어오도록 스크롤
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;
      const containerWidth = container.offsetWidth;
      const containerScrollLeft = container.scrollLeft;

      // 버튼이 왼쪽에 있을 경우
      if (buttonLeft < containerScrollLeft) {
        container.scrollTo({
          left: buttonLeft - 16, // 왼쪽 여백 추가
          behavior: 'smooth',
        });
      }
      // 버튼이 오른쪽에 있을 경우
      else if (
        buttonLeft + buttonWidth >
        containerScrollLeft + containerWidth
      ) {
        container.scrollTo({
          left: buttonLeft + buttonWidth - containerWidth + 16, // 오른쪽 여백 추가
          behavior: 'smooth',
        });
      }
    }
  }, [selectedCategory]);

  const handleCategoryClick = (categoryId: string) => {
    // 상태 업데이트를 먼저 실행
    onCategoryClick(categoryId);

    // URL을 복사하고 쿼리 파라미터 업데이트
    const url = new URL(window.location.href);
    if (categoryId !== 'search') {
      url.searchParams.delete('q');
    }
    url.searchParams.set('category', categoryId);

    // URL만 교체하고 페이지 전환 방지
    window.history.pushState({}, '', url.toString());
  };

  const searchParams = useSearchParams();

  // URL에서 카테고리 파라미터 확인
  useEffect(() => {
    const categoryParams = searchParams.get('category');
    if (categoryParams && categoryParams !== selectedCategory) {
      onCategoryClick(categoryParams);
    }
  }, [searchParams, selectedCategory, onCategoryClick]);

  const handleCategoryClick = (categoryId: string) => {
    // 상태 업데이트를 먼저 실행
    onCategoryClick(categoryId);

    // URL을 복사하고 쿼리 파라미터 업데이트
    const url = new URL(window.location.href);
    if (categoryId !== 'search') {
      url.searchParams.delete('q');
    }
    url.searchParams.set('category', categoryId);

    // URL만 교체하고 페이지 전환 방지
    window.history.pushState({}, '', url.toString());
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

  // 모바일 터치 이벤트 처리
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
          onClick={() => handleCategoryClick(id)}
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
