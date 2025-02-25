'use client';

import { useRef } from 'react';

interface VideoPlayerProps {
  contentUrl: string;
  type: 'video' | 'text';
}

export default function VideoPlayer({ contentUrl, type }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
    const videoId = contentUrl.includes('youtube.com/watch?v=')
      ? contentUrl.split('v=')[1]?.split('&')[0]
      : contentUrl.includes('youtu.be/')
        ? contentUrl.split('youtu.be/')[1]
        : '';

    return (
      <div className="aspect-video w-full">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
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
  );
}
