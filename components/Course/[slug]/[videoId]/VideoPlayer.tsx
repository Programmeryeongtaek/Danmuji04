import { VideoPlayerProps } from '@/types/course/courseType';
import Script from 'next/script';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT: {
      Player: {
        new (
          element: HTMLDivElement | string,
          config: YouTubePlayerConfig
        ): YouTubePlayer;
      };
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeEvent {
  data: number;
  target: YouTubePlayer;
}

interface YouTubePlayer {
  destroy: () => void;
  addEventListener: (
    event: string,
    listener: (event: YouTubeEvent) => void
  ) => void;
  removeEventListener: (
    event: string,
    listener: (event: YouTubeEvent) => void
  ) => void;
}

interface YouTubePlayerVars {
  autoplay?: 0 | 1;
  rel?: 0 | 1;
  controls?: 0 | 1;
}

interface YouTubePlayerConfig {
  videoId: string;
  playerVars: YouTubePlayerVars;
  events?: {
    onStateChange?: (event: YouTubeEvent) => void;
  };
}

const VideoPlayer = ({ youtubeId, onComplete }: VideoPlayerProps) => {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: YouTubePlayer | null = null;

    const initPlayer = () => {
      if (!playerContainerRef.current) return;

      player = new window.YT.Player(playerContainerRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          controls: 1,
        },
        events: {
          onStateChange: (event: YouTubeEvent) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              console.log('Video ended');
              onComplete?.();
            }
          },
        },
      } as YouTubePlayerConfig);

      playerRef.current = player;
    };

    // API가 이미 로드되어 있는 경우
    if (window.YT) {
      initPlayer();
    } else {
      // API가 로드되면 실행될 콜백
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [youtubeId, onComplete]);

  return (
    <div>
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="afterInteractive"
      />
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <div ref={playerContainerRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default VideoPlayer;
