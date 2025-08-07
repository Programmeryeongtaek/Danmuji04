'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Category from './Category';
import LectureSection from './LectureSection';
import { useAtom, useAtomValue } from 'jotai';
import {
  hasActiveFiltersAtom,
  resetFiltersAtom,
  searchFilterAtom,
} from '@/store/knowledge/searchFilterAtom';

export default function KnowledgePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryCategory = searchParams.get('category');
  const searchQuery = searchParams.get('q');

  const [selectedCategory, setSelectedCategory] = useState(
    queryCategory || 'all'
  );
  const [, resetFilters] = useAtom(resetFiltersAtom);

  // 전역 필터 상태 감지
  const searchFilter = useAtomValue(searchFilterAtom);
  const hasActiveFilters = useAtomValue(hasActiveFiltersAtom);

  // URL과 상태 동기화 (초기 로드시에만)
  useEffect(() => {
    const urlCategory = queryCategory || 'all';
    if (urlCategory !== selectedCategory) {
      setSelectedCategory(urlCategory);
    }
  }, [queryCategory]);

  // 필터나 키워드가 활성화되면 '검색' 카테고리로 자동 변경
  useEffect(() => {
    const hasFilters = hasActiveFilters; // 키워드 제외한 순수 필터만
    const hasKeywords = searchFilter.selectedKeywords.length > 0;
    const hasFiltersOrKeywords = hasFilters || hasKeywords;

    if (hasFiltersOrKeywords && selectedCategory !== 'search') {
      setSelectedCategory('search');

      // URL에 search 상태 반영
      const newParams = new URLSearchParams(searchParams);
      newParams.set('category', 'search');

      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [
    hasActiveFilters,
    searchFilter.selectedKeywords.length,
    selectedCategory,
    router,
    searchParams,
  ]);

  // 카테고리 변경 핸들러
  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      // 검색이 아닌 다른 카테고리로 변경시 필터 초기화
      if (categoryId !== 'search') {
        resetFilters();
      }

      // 상태 업데이트
      setSelectedCategory(categoryId);

      // URL 업데이트
      const newParams = new URLSearchParams();

      // 검색 관련 파라미터 처리
      if (categoryId === 'search' && searchQuery) {
        newParams.set('q', searchQuery);
      }

      // 카테고리 파라미터 설정
      if (categoryId !== 'all') {
        newParams.set('category', categoryId);
      }

      // 기존 필터/키워드 파라미터 유지 (검색 카테고리인 경우)
      if (categoryId === 'search') {
        if (searchParams.get('keywords')) {
          newParams.set('keywords', searchParams.get('keywords')!);
        }
        if (searchParams.get('depth')) {
          newParams.set('depth', searchParams.get('depth')!);
        }
        if (searchParams.get('fields')) {
          newParams.set('fields', searchParams.get('fields')!);
        }
        if (searchParams.get('hasGroup')) {
          newParams.set('hasGroup', searchParams.get('hasGroup')!);
        }
      }

      // URL 생성 및 이동
      const newUrl = newParams.toString()
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;

      router.replace(newUrl, { scroll: false });
    },
    [router, resetFilters, searchQuery, searchParams]
  );

  return (
    <div className="flex flex-col gap-6">
      <Category
        selectedCategory={selectedCategory}
        onCategoryClick={handleCategoryChange}
      />

      <LectureSection
        selectedCategory={selectedCategory}
        searchQuery={searchQuery || ''}
      />
    </div>
  );
}
