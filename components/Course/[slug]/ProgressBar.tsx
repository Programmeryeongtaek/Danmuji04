interface ProgressbarProps {
  current: number;
  total: number;
}

const ProgressBar = ({ current, total }: ProgressbarProps) => {
  const progress = (current / total) * 100;

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gold-start transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="text-sm text-gray-600">
        {current}/{total} 수강완료
      </div>
    </div>
  );
};

export default ProgressBar;
