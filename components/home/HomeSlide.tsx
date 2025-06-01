'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// 슬라이드 데이터 정의
const slideData = [
  {
    id: 1,
    title: '환영합니다',
    description:
      '무지를 끊는 학습 공간 \n단무지(斷-無知)에 오신 것을 환영합니다.',
    buttonText: '소개 페이지',
    link: '/introduce',
    bgColor: 'bg-gold-start/30',
    imageUrl:
      'https://images.unsplash.com/photo-1743593035236-b3d6cbf351ac?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 2,
    title: '지식 탐험',
    description: '다양한 분야의 강의를 통해 \n지식을 쌓아보세요.',
    buttonText: '강의 둘러보기',
    link: '/knowledge',
    bgColor: 'bg-blue-50',
    imageUrl:
      'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 3,
    title: '코스 학습',
    description: '주제별로 선별한 영상들로 \n체계적으로 공부하고 수료해보세요.',
    buttonText: '코스 살펴보기',
    link: '/course',
    bgColor: 'bg-emerald-50',
    imageUrl:
      'https://images.unsplash.com/photo-1644564924153-2b2d1a08b2a5?q=80&w=1373&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 4,
    title: '스터디 모임',
    description:
      '함께 공부하며 지식을 정립하는 공간 \n관심 있는 분야의 스터디에 참여하거나 개설해보세요.',
    buttonText: '스터디 참여하기',
    link: '/study',
    bgColor: 'bg-gold-start/40',
    imageUrl:
      'https://images.unsplash.com/photo-1617239098289-ad0ee436361e?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 5,
    title: '도서 추천',
    description: '추천 도서를 함께 읽고 \n좋은 내용을 나눠보세요.',
    buttonText: '도서 살펴보기',
    link: '/study?category=book',
    bgColor: 'bg-rose-50',
    imageUrl:
      'https://images.unsplash.com/photo-1709924168698-620ea32c3488?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 6,
    title: '학습 현황',
    description: '학습 진행현황을 점검하고 \n학습을 이어가보세요.',
    buttonText: '대시보드 바로가기',
    link: '/dashboard',
    bgColor: 'bg-purple-50',
    imageUrl:
      'https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?q=80&w=1173&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
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
    <div className="relative w-full overflow-hidden rounded-lg shadow-md mobile:h-[300px] tablet:h-[400px] laptop:h-[500px]">
      {/* 현재 슬라이드 번호 표시 */}
      <div className="absolute right-4 top-4 z-10 rounded bg-black/50 px-2 py-1 text-sm text-white">
        {currentSlide + 1} / {slideData.length}
      </div>

      {/* 슬라이드 내용 */}
      <Link href={slide.link} className="block h-full">
        <div
          className={`relative flex h-full flex-col items-center justify-center px-8 py-10 text-center transition-all duration-500 ${slide.bgColor} hover:bg-opacity-80`}
          style={{
            backgroundImage: slide.imageUrl
              ? `url(${slide.imageUrl})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* 어두운 오버레이 */}
          <div className="absolute inset-0 bg-black/40" />

          {/* 텍스트 내용 (z-10으로 위에 올림) */}
          <h2 className="z-10 mb-4 font-bold text-white mobile:text-2xl tablet:text-4xl laptop:text-6xl">
            {slide.title}
          </h2>
          <p className="z-10 mb-6 flex max-w-md items-center whitespace-pre-line text-center text-white mobile:h-[50px] mobile:text-base tablet:h-[70px] tablet:text-lg laptop:text-xl">
            {slide.description}
          </p>
          <div className="z-10 rounded-full bg-gradient-to-r from-gold-start to-gold-end py-2 text-white mobile:px-2 mobile:text-base tablet:px-6 tablet:text-lg laptop:px-6">
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
            className={`h-3 w-3 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-gold-start mobile:w-[30px] tablet:w-[40px] laptop:w-[50px]'
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
