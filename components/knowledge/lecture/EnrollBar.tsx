'use client';

const EnrollBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* TODO: 수강하면, 학습 중으로 나오면서 옆에 진행률을 표시 */}
        <span>학습 전 / 학습 중</span>
        <button className="rounded-md bg-green-500 px-8 py-2 text-white hover:bg-green-600">
          학습하기 / 계속 학습
        </button>
      </div>
    </div>
  );
};

export default EnrollBar;
