import { VideoPlayerProps } from '@/types/course/courseType';

const VideoPlayer = ({ videoUrl, onComplete }: VideoPlayerProps) => {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video
        src={videoUrl}
        controls
        className="w-ful h-full"
        onEnded={onComplete}
      />
    </div>
  );
};

export default VideoPlayer;
