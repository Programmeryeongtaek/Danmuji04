'use client';

import Button from '@/components/common/Button/Button';
import CompletionModal from '@/components/common/CompletionModal';
import { useToast } from '@/components/common/Toast/Context';

import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  contentUrl?: string; // YouTube URL이나 일반 비디오 URL
  type?: 'video' | 'text';
  youtubeId?: string; // YouTube ID
  onComplete?: () => void | Promise<void>;
  isLastItem?: boolean;
  courseId?: string;
  itemId?: string;
  category?: string;
}

export default function VideoPlayer({
  contentUrl,
  type,
  youtubeId,
  onComplete,
  isLastItem,
  courseId,
  itemId,
  category,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasMarkedAsComplete, setHasMarkedAsComplete] = useState(false);
  const { showToast } = useToast();

  // 디버깅용 로그 추가
  useEffect(() => {
    console.log('VideoPlayer 마운트됨:', {
      contentUrl,
      type,
      youtubeId,
      isLastItem,
      courseId,
      itemId,
      category,
    });
  }, [contentUrl, type, youtubeId, isLastItem, courseId, itemId, category]);

  useEffect(() => {
    // 비디오 타입일 때만 이벤트 리스너 설정
    if (type !== 'video') return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    // 비디오 완료 감지
    const handleVideoEnded = () => {
      if (!hasMarkedAsComplete) {
        console.log('비디오 종료됨, 완료 처리 시작');
        setHasMarkedAsComplete(true);
        showToast('학습을 완료했습니다!', 'success');
        setShowCompletionModal(true);
        if (onComplete) {
          try {
            onComplete();
          } catch (error) {
            console.error('완료 콜백 실행 중 오류:', error);
          }
        }
      }
    };

    // 95%이상 시청 시 완료로 간주
    const handleTimeUpdate = () => {
      const video = videoElement;
      if (!video) return;

      const duration = video.duration;
      const currentTime = video.currentTime;

      // NaN이나 Infinity 체크 추가
      if (isNaN(duration) || !isFinite(duration) || duration <= 0) return;

      const progressPercent = (currentTime / duration) * 100;

      if (
        progressPercent >= 95 &&
        !hasMarkedAsComplete &&
        !showCompletionModal
      ) {
        console.log('95% 이상 시청, 완료 처리 시작');
        setHasMarkedAsComplete(true);
        showToast('학습을 완료했습니다!', 'success');
        setShowCompletionModal(true);
        if (onComplete) {
          try {
            onComplete();
          } catch (error) {
            console.error('완료 콜백 실행 중 오류:', error);
          }
        }
      }
    };

    videoElement.addEventListener('ended', handleVideoEnded);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      videoElement.removeEventListener('ended', handleVideoEnded);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [type, showCompletionModal, hasMarkedAsComplete, showToast, onComplete]);

  // 모달 닫기 처리
  const handleCloseModal = () => {
    setShowCompletionModal(false);
  };

  // 다음 강의로 이동
  const handleNextVideo = () => {
    if (onComplete) {
      try {
        onComplete();
      } catch (error) {
        console.error('다음 비디오 이동 중 오류:', error);
      }
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
    // YouTube 임베드에서는 진행률 추적이 어렵기 때문에
    // 별도의 버튼을 제공하여 사용자가 직접 완료 표시하도록 함
    const videoId = contentUrl.includes('youtube.com/watch?v=')
      ? contentUrl.split('v=')[1]?.split('&')[0]
      : contentUrl.includes('youtu.be/')
        ? contentUrl.split('youtu.be/')[1]
        : youtubeId || '';

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

        {/* YouTube 영상은 직접 진행률 추적이 어려워 사용자가 완료 버튼을 클릭하도록 함 */}
        {!hasMarkedAsComplete ? (
          <Button
            onClick={async () => {
              try {
                if (onComplete) {
                  await onComplete();
                }
                setHasMarkedAsComplete(true);
                showToast('학습을 완료했습니다!', 'success');
              } catch (error) {
                console.error('완료 콜백 실행 중 오류:', error);
                showToast('완료 처리 중 오류가 발생했습니다.', 'error');
              }
            }}
            className="mt-4 h-10 w-full rounded-lg px-4 py-2 text-white"
          >
            학습 완료 표시하기
          </Button>
        ) : (
          <div className="mt-4 h-10"></div>
        )}

        {/* 완료 모달 */}
        <CompletionModal
          isOpen={showCompletionModal}
          onClose={handleCloseModal}
          isLastVideo={isLastItem || false}
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
        isLastVideo={isLastItem || false}
        onNextVideo={handleNextVideo}
      />
    </div>
  );
}
