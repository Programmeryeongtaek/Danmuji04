'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Button from '../common/Button/Button';
import { Tag, X } from 'lucide-react';
import Modal from '../common/Modal';

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
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [tempSelectedKeywords, setTempSelectedKeywords] = useState<string[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
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

  // URL에서 키워드 파라미터 읽기
  useEffect(() => {
    const keywordsParam = searchParams.get('keywords');
    if (keywordsParam) {
      const parsedKeywords = keywordsParam.split(',');
      setSelectedKeywords(parsedKeywords);
      setTempSelectedKeywords(parsedKeywords);
    } else {
      // URL에 키워드 파라미터가 없으면 선택된 키워드 초기화
      setSelectedKeywords([]);
      setTempSelectedKeywords([]);
    }
  }, [searchParams]);

  // 모달 열기
  const openModal = () => {
    setTempSelectedKeywords([...selectedKeywords]);
    setIsModalOpen(true);
  };

  // 키워드 선택 토글
  const toggleKeyword = (keywords: string) => {
    setTempSelectedKeywords((prev) => {
      const isSelected = prev.includes(keywords);
      return isSelected
        ? prev.filter((k) => k !== keywords)
        : [...prev, keywords];
    });
  };

  // 키워드 필터 적용
  const applyKeywords = () => {
    setSelectedKeywords(tempSelectedKeywords);
    updateUrlWithKeywords(tempSelectedKeywords);
    setIsModalOpen(false);
  };

  // 키워드로 URL 업데이트
  const updateUrlWithKeywords = (keywords: string[]) => {
    const params = new URLSearchParams(searchParams.toString());

    if (keywords.length > 0) {
      params.set('keywords', keywords.join(','));
    } else {
      params.delete('keywords');
    }

    // URL 업데이트 (페이지는 리로드하지 않음)
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  // 선택한 키워드 모두 제거
  const clearAllKeywords = () => {
    setTempSelectedKeywords([]);
  };

  return (
    <>
      {/* 버튼 */}
      <button
        onClick={openModal}
        className={`flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm transition-colors hover:border-gold-start ${
          selectedKeywords.length > 0
            ? 'border-gold-start bg-gray-50 text-gold-start'
            : 'text-gray-700'
        }`}
      >
        <Tag className="h-4 w-4" />
        <span>
          {selectedKeywords.length > 0
            ? `키워드 ${selectedKeywords.length}개`
            : '키워드'}
        </span>
      </button>

      {/* 모달 */}
      <Modal.Root isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">키워드 선택</h2>
              <button onClick={() => setIsModalOpen(false)}>
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
                      onClick={() => toggleKeyword(keyword)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        tempSelectedKeywords.includes(keyword)
                          ? 'bg-gradient-to-r from-gold-start to-gold-end text-white'
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
                        선택된 키워드
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
                          className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-sm"
                        >
                          <span>{keyword}</span>
                          <button
                            onClick={() => toggleKeyword(keyword)}
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
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <Button onClick={applyKeywords} className="px-4 py-2">
                적용하기
              </Button>
            </div>
          </div>
        </div>
      </Modal.Root>
    </>
  );
};

export default KeywordSelector;
