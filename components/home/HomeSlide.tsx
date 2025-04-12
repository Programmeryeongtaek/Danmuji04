'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// 슬라이드 데이터 정의
const slideData = [
  {
    id: 1,
    title: '단무지에 오신 것을 환영합니다',
    description: '지식과 배움의 여정, 단무지와 함께 시작해보세요.',
    buttonText: '서비스 소개 보기',
    link: '/introduce',
    bgColor: 'bg-gold-start/10',
  },
  {
    id: 2,
    title: '지식 탐색하기',
    description: '다양한 분야의 강의를 탐색하고 새로운 지식을 습득하세요.',
    buttonText: '강의 둘러보기',
    link: '/knowledge',
    bgColor: 'bg-blue-50',
  },
  {
    id: 3,
    title: '코스 학습하기',
    description: '체계적으로 구성된 코스로 깊이 있는 학습을 경험하세요.',
    buttonText: '코스 살펴보기',
    link: '/course',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 4,
    title: '나의 학습 현황',
    description: '등록한 강의와 학습 진행 상황을 한눈에 확인하세요.',
    buttonText: '대시보드 바로가기',
    link: '/dashboard',
    bgColor: 'bg-purple-50',
  },
];

const HomeSlide = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 자동 슬라이드 기능
  useEffect(() => {
    // 자동 재생이 비활성화되어 있으면 실행하지 않음
    if (!autoplay) return;

    // 이전 타이머 정리
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
    }

    // 새 타이머 설정
    autoplayTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideData.length);
    }, 5000);

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [autoplay, currentSlide]);

  // 특정 슬라이드로 직접 이동 및 자동 재생 일시 중단 후 재개
  const goToSlide = (index: number) => {
    if (currentSlide === index) return; // 같은 슬라이드면 무시

    // 자동 재생 일시 중단
    setAutoplay(false);

    // 슬라이드 변경
    setCurrentSlide(index);

    // 기존 재개 타이머 취소
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
    }

    // 5초 후에 자동 재생 재개
    autoplayTimerRef.current = setTimeout(() => {
      setAutoplay(true);
    }, 5000);
  };

  const slide = slideData[currentSlide];

  return (
    <div className="relative h-[300px] w-full overflow-hidden rounded-lg shadow-md">
      {/* 현재 슬라이드 번호 표시 */}
      <div className="absolute right-4 top-4 z-10 rounded bg-black/50 px-2 py-1 text-sm text-white">
        {currentSlide + 1} / {slideData.length}
      </div>

      {/* 슬라이드 내용 */}
      <Link href={slide.link} className="block h-full">
        <div
          className={`flex h-full flex-col items-center justify-center px-8 py-10 text-center transition-all duration-500 ${slide.bgColor} hover:bg-opacity-80`}
        >
          <h2 className="mb-4 text-2xl font-bold">{slide.title}</h2>
          <p className="mb-6 max-w-md text-gray-700">{slide.description}</p>
          <div className="rounded-full bg-gradient-to-r from-gold-start to-gold-end px-6 py-2 text-white">
            {slide.buttonText}
          </div>
        </div>
      </Link>

      {/* 슬라이드 인디케이터 */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {slideData.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.preventDefault(); // 링크 클릭 이벤트 중지
              goToSlide(index);
            }}
            className={`h-2 w-2 rounded-full transition-all ${
              index === currentSlide
                ? 'w-8 bg-gold-start'
                : 'bg-gray-400 hover:bg-gray-600'
            }`}
            aria-label={`슬라이드 ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HomeSlide;
