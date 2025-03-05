'use client';

import CompletionModal from '@/components/Course/[slug]/[videoId]/CompletionModal';
import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  contentUrl: string;
  type: 'video' | 'text';
  onComplete?: () => void;
  isLastItem?: boolean;
}

export default function VideoPlayer({
  contentUrl,
  type,
  onComplete,
  isLastItem,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    // 비디오 타입일 때만 이벤트 리스너 설정
    if (type !== 'video') return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    // 비디오 완료 감지
    const handleVideoEnded = () => {
      setShowCompletionModal(true);
    };

    // 95%이상 시청 시 완료로 간주
    const handleTimeUpdate = () => {
      const video = videoElement;
      if (!video) return;

      const duration = video.duration;
      const currentTime = video.currentTime;
      const progressPercent = (currentTime / duration) * 100;

      if (progressPercent >= 95 && !showCompletionModal) {
        setShowCompletionModal(true);
      }
    };

    videoElement.addEventListener('ended', handleVideoEnded);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      videoElement.removeEventListener('ended', handleVideoEnded);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [type, showCompletionModal]);

  // 모달 닫기 처리
  const handleCloseModal = () => {
    setShowCompletionModal(false);
  };

  // 다음 강의로 이동
  const handleNextVideo = () => {
    if (onComplete) {
      onComplete();
    }
    setShowCompletionModal(false);
  };

  // 텍스트 타입인 경우 텍스트 내용을 보여줌
  if (type === 'text') {
    return (
      <div className="aspect-video w-full bg-white p-6">
        <div className="h-full w-full overflow-y-auto p-4 text-gray-800">
          {contentUrl}
        </div>
      </div>
    );
  }

  // 동영상 URL이 YouTube인 경우 YouTube 임베드 처리
  if (
    contentUrl &&
    (contentUrl.includes('youtube.com') || contentUrl.includes('youtu.be'))
  ) {
    // YouTube 임베드 코드 유지...
    const videoId = contentUrl.includes('youtube.com/watch?v=')
      ? contentUrl.split('v=')[1]?.split('&')[0]
      : contentUrl.includes('youtu.be/')
        ? contentUrl.split('youtu.be/')[1]
        : '';

    return (
      <div className="flex flex-col">
        <div className="aspect-video w-full">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>

        {/* 완료 모달 */}
        <CompletionModal
          isOpen={showCompletionModal}
          onClose={handleCloseModal}
          isLastVideo={isLastItem}
          onNextVideo={handleNextVideo}
        />
      </div>
    );
  }

  // URL이 없는 경우 플레이스홀더 표시
  if (!contentUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-gray-800 text-white">
        <p>비디오가 준비되지 않았습니다.</p>
      </div>
    );
  }

  // 일반 비디오 URL
  return (
    <div className="flex flex-col">
      <div className="aspect-video w-full">
        <video
          ref={videoRef}
          className="h-full w-full"
          controls
          playsInline
          src={contentUrl}
        >
          <source src={contentUrl} type="video/mp4" />
          브라우저에서 비디오 재생을 지원하지 않습니다.
        </video>
      </div>

      {/* 완료 모달 */}
      <CompletionModal
        isOpen={showCompletionModal}
        onClose={handleCloseModal}
        isLastVideo={isLastItem}
        onNextVideo={handleNextVideo}
      />
    </div>
  );
}
