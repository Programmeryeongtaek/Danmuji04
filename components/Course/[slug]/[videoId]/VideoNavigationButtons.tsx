import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VideoNavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const VideoNavigationButtons = ({
  onPrevious,
  onNext,
  isFirst,
  isLast,
}: VideoNavigationButtonsProps) => {
  return (
    <div>
      <button onClick={onPrevious} disabled={isFirst}>
        <ChevronLeft />
      </button>
      <button onClick={onNext} disabled={isLast}>
        <ChevronRight />
      </button>
    </div>
  );
};

export default VideoNavigationButtons;
