'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Button from '../common/Button/Button';
import { Tag, X } from 'lucide-react';
import { useAtom, useAtomValue } from 'jotai';
import {
  getUrlParamsAtom,
  initializeFromUrlAtom,
  searchFilterAtom,
  updateKeywordsAtom,
} from '@/store/knowledge/searchFilterAtom';

// API에서 인기 키워드를 가져오는 함수
const fetchKeywords = async (): Promise<string[]> => {
  try {
    const supabase = createClient();

    // lectures 테이블에서 keyword 필드 가져오기
    const { data, error } = await supabase
      .from('lectures')
      .select('keyword')
      .not('keyword', 'is', null);

    if (error) {
      console.error('키워드 가져오기 오류:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      // 기본 키워드 세트 제공
      return ['인문학', '철학', '심리학', '교양인문학'];
    }

    // 모든 키워드 문자열을 분리하고 중복 제거
    const allKeywords = data
      .flatMap((lecture) => {
        if (!lecture.keyword) return [];
        return lecture.keyword.split(',').map((k: string) => k.trim());
      })
      .filter((keyword) => keyword.length > 0);

    // 중복 제거 후 반환
    return [...new Set(allKeywords)];
  } catch (error) {
    console.error('키워드 로드 실패:', error);
    // 에러 시 기본 키워드 반환
    return ['인문학', '철학', '심리학', '교양인문학'];
  }
};

const KeywordSelector = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [tempSelectedKeywords, setTempSelectedKeywords] = useState<string[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  const searchFilter = useAtomValue(searchFilterAtom);
  const selectedKeywords = searchFilter.selectedKeywords;

  const [, updateKeywords] = useAtom(updateKeywordsAtom);
  const [, initializeFromUrl] = useAtom(initializeFromUrlAtom);
  const getUrlParams = useAtomValue(getUrlParamsAtom);

  const router = useRouter();
  const searchParams = useSearchParams();

  // 키워드 데이터 로드
  useEffect(() => {
    const loadKeywords = async () => {
      setIsLoading(true);
      try {
        const keywordsData = await fetchKeywords();
        setKeywords(keywordsData);
      } catch (error) {
        console.error('키워드 로드 실패:', error);
        // 실패 시 하드코딩된 기본 키워드 사용
        setKeywords(['인문학', '철학', '심리학', '교양인문학']);
      } finally {
        setIsLoading(false);
      }
    };

    loadKeywords();
  }, []);

  // URL 초기화
  useEffect(() => {
    const params = {
      q: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      keywords: searchParams.get('keywords') || undefined,
      depth: searchParams.get('depth') || undefined,
      fields: searchParams.get('fields') || undefined,
      hasGroup: searchParams.get('hasGroup') || undefined,
      sort: searchParams.get('sort') || undefined,
    };

    initializeFromUrl(params);
  }, []);

  // 전역상태 변경 시 URL 업데이트
  useEffect(() => {
    const urlParams = getUrlParams;
    if (urlParams) {
      const newUrl = `${window.location.pathname}?${urlParams}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchFilter, getUrlParams, router]);

  // 모달 열기
  const openModal = () => {
    setTempSelectedKeywords([...selectedKeywords]);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // 키워드 선택 토글 (로컬 임시 상태용)
  const toggleKeywordLocal = (keyword: string) => {
    setTempSelectedKeywords((prev) => {
      const isSelected = prev.includes(keyword);
      return isSelected
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword];
    });
  };

  // 키워드 필터 적용 (전역상태 업데이트)
  const applyKeywords = () => {
    updateKeywords(tempSelectedKeywords);
    setIsModalOpen(false);
  };

  // 선택한 키워드 모두 제거
  const clearAllKeywords = () => {
    setTempSelectedKeywords([]);
  };

  return (
    <>
      {/* 버튼 - 필터와 동일한 스타일로 변경 */}
      <button
        onClick={openModal}
        className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:border-gold-start hover:bg-light hover:text-black ${
          selectedKeywords.length > 0
            ? 'border-gold-start bg-light font-medium text-black'
            : 'border-gray-200 text-gray-700'
        }`}
      >
        <Tag className="h-4 w-4" />
        <span>키워드</span>
        {selectedKeywords.length > 0 && (
          <span className="ml-1 rounded-full bg-gold-start/20 px-1.5 py-0.5 text-xs">
            {selectedKeywords.length}
          </span>
        )}
      </button>

      {/* 모달 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">키워드 선택</h2>
              <button
                onClick={closeModal}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => toggleKeywordLocal(keyword)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        tempSelectedKeywords.includes(keyword)
                          ? 'bg-gradient-to-r from-gold-start to-gold-end text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>

                {/* 선택된 키워드 */}
                {tempSelectedKeywords.length > 0 && (
                  <div className="mb-6 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700">
                        선택된 키워드 ({tempSelectedKeywords.length}개)
                      </h3>
                      <button
                        onClick={clearAllKeywords}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        모두 지우기
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {tempSelectedKeywords.map((keyword) => (
                        <div
                          key={`selected-${keyword}`}
                          className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-sm shadow-sm"
                        >
                          <span>{keyword}</span>
                          <button
                            onClick={() => toggleKeywordLocal(keyword)}
                            className="rounded-full p-0.5 hover:bg-gray-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <Button onClick={applyKeywords} className="px-4 py-2">
                적용
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeywordSelector;
