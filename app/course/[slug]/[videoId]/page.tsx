import VideoPlayer from '@/components/Course/[slug]/[videoId]/VideoPlayer';
import WriteSection from '@/components/Course/[slug]/[videoId]/WriteSection';
import { VideoPageProps } from '@/types/course/courseType';

const VideoPage = ({ params }: VideoPageProps) => {
  return (
    <div>
      <div>
        <VideoPlayer videoUrl="/mock-video-url.mp4" />
      </div>
      <div className="flex flex-col">
        <div className="flex flex-col">
          <h1>강의 제목</h1>
          <span>키워드</span>
          <p>강의 정보 및 설명</p>
        </div>
      </div>
      <div>
        <WriteSection videoId={params.videoId} />
      </div>
    </div>
  );
};

export default VideoPage;
