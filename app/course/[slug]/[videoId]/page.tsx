'use client';

import CompletionModal from '@/components/Course/[slug]/[videoId]/CompletionModal';
import VideoNavigationButtons from '@/components/Course/[slug]/[videoId]/VideoNavigationButtons';
import VideoPlayer from '@/components/Course/[slug]/[videoId]/VideoPlayer';
import WriteSection from '@/components/Course/[slug]/[videoId]/WriteSection';
import { mockCourses } from '@/dummy/YoutubeData';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

const VideoPage = () => {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as 'reading' | 'writing' | 'question';
  const videoId = params.videoId as string;

  const currentCourseVideo = mockCourses[slug];
  const currentIndex = currentCourseVideo.findIndex((v) => v.id === videoId);
  const isLastVideo = currentIndex === currentCourseVideo.length - 1;
  const video = currentCourseVideo[currentIndex];

  const [isWatched, setIsWatched] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleVideoComplete = useCallback(() => {
    setIsWatched(true);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleNextVideo = useCallback(() => {
    const nextVideo = currentCourseVideo[currentIndex + 1];
    if (nextVideo) {
      router.push(`/course/${slug}/${nextVideo.id}`);
    }
    setShowModal(false);
  }, [currentCourseVideo, currentIndex, router, slug]);

  const handlePreviousVideo = () => {
    const prevVideo = currentCourseVideo[currentIndex - 1];
    if (prevVideo) {
      router.push(`/course/${slug}/${prevVideo.id}`);
    }
  };

  if (!video) {
    return <div>Video not found</div>;
  }

  return (
    <div className="relative">
      <VideoPlayer
        youtubeId={video.youtubeId}
        onComplete={handleVideoComplete}
      />
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
      <VideoNavigationButtons
        onPrevious={handlePreviousVideo}
        onNext={handleNextVideo}
        isFirst={currentIndex === 0}
        isLast={currentIndex === currentCourseVideo.length - 1}
      />
      <CompletionModal
        isOpen={showModal}
        onClose={handleModalClose}
        isLastVideo={isLastVideo}
        onNextVideo={!isLastVideo ? handleNextVideo : undefined}
      />
    </div>
  );
};

export default VideoPage;
