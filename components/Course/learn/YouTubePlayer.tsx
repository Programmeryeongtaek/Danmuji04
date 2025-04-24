'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

interface YouTubePlayerProps {
  youtubeId: string;
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubePlayer({ youtubeId }: YouTubePlayerProps) {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 이미 API가 로드되었다면 바로 플레이어 초기화
    if (window.YT && window.YT.Player) {
      initializePlayer();
    } else {
      // API가 로드 후 초기화하도록 콜백 설정
      window.onYouTubeIframeAPIReady = initializePlayer;
    }

    // 플레이어 초기화 함수
    function initializePlayer() {
      if (!containerRef.current) return;

      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onStateChange: onPlayerStateChange,
        },
      });
    }

    // 플레이어 상태 변경 이벤트 핸들러
    function onPlayerStateChange() {
      // 여기서 필요한 이벤트 처리 (예: 시청 완료 시 처리)
      // if (event.data === window.YT.PlayerState.ENDED) {
      //   console.log('Video ended');
      //   // 시청 완료 처리 로직
      // }
    }

    // 컴포넌트 언마운트 시 플레이어 정리
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [youtubeId]);

  return (
    <>
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="afterInteractive"
      />
      <div className="aspect-video w-full bg-black">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </>
  );
}
