'use client';

import VideoPlayer from '@/components/Course/[slug]/[videoId]/VideoPlayer';
import WriteSection from '@/components/Course/[slug]/[videoId]/WriteSection';
import { mockCourses } from '@/dummy/YoutubeData';
import { useParams } from 'next/navigation';
import { useState } from 'react';

const VideoPage = () => {
  const params = useParams();
  const slug = params.slug as 'reading' | 'writing' | 'question';
  const videoId = params.videoId as string;

  const video = mockCourses[slug].find((v) => v.id === videoId);

  const [isWatched, setIsWatched] = useState(false);

  if (!video) {
    return <div>Video not found</div>;
  }

  const handleVideoComplete = () => {
    setIsWatched(true);
  };

  return (
    <div>
      <div>
        <VideoPlayer
          youtubeId={video?.youtubeId}
          onComplete={handleVideoComplete}
        />
      </div>
      <div className="flex flex-col">
        <div className="flex flex-col">
          <h1>강의 제목</h1>
          <div className="flex gap-2">
            {video?.keywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
          <p>{video?.description}</p>
        </div>
      </div>
      <div>
        <WriteSection onSubmit={(content) => console.log(content)} />
      </div>
      {isWatched && <div>시청 완료</div>}
    </div>
  );
};

export default VideoPage;
