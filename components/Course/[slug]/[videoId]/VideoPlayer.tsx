import { VideoPlayerProps } from '@/types/course/courseType';

const VideoPlayer = ({ youtubeId, onComplete }: VideoPlayerProps) => {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${youtubeId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope  ; picture-in-picture"
        allowFullScreen
        onEnded={onComplete}
        className="h-full w-full"
      />
    </div>
  );
};

export default VideoPlayer;
