const ProgressBar = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">강의 진행률</span>
        <span className="text-sm font-medium text-gray-700">{progress}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-200">
        <div
          className="h-2.5 rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1 flex justify-end">
        <span className="text-xs text-gray-500">
          {current}/{total} 완료
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
