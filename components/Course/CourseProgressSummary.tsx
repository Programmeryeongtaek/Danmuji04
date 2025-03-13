'use client';

import { Award, Book, Edit } from 'lucide-react';
import { useState } from 'react';
import CertificateModal from './CertificateModal';

interface CourseProgressSummaryProps {
  categoryName: string;
  totalCourses: number;
  completedCourses: number;
  completedWritings: number;
  userName: string;
}

export default function CourseProgressSummary({
  categoryName,
  totalCourses,
  completedCourses,
  completedWritings,
  userName,
}: CourseProgressSummaryProps) {
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const isAllCompleted =
    totalCourses > 0 &&
    completedCourses === totalCourses &&
    completedWritings === totalCourses;

  const progressPercentage =
    totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  const writingPercentage =
    totalCourses > 0 ? Math.round((completedWritings / totalCourses) * 100) : 0;

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">
        {categoryName} 학습 진행상황
      </h3>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 학습 진행률 */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">학습 진행률</span>
            </div>
            <span className="font-semibold text-blue-600">
              {progressPercentage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {completedCourses} / {totalCourses} 완료
          </div>
        </div>

        {/* 글작성 진행률 */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">글작성 현황</span>
            </div>
            <span className="font-semibold text-green-600">
              {writingPercentage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${writingPercentage}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {completedWritings} / {totalCourses} 완료
          </div>
        </div>

        {/* 수료 상태 */}
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border p-4 transition-colors ${
            isAllCompleted
              ? 'border-gold-start bg-gold-end/10 text-gold-start'
              : 'border-gray-200 bg-gray-50 text-gray-400'
          }`}
          onClick={() => isAllCompleted && setShowCertificateModal(true)}
        >
          <Award className="mb-2 h-10 w-10" />
          <span className="text-center text-sm font-medium">
            {isAllCompleted
              ? '수료증 발급 가능!'
              : '모든 강의를 완료하면 수료증을 발급받을 수 있습니다'}
          </span>
        </div>
      </div>

      {isAllCompleted && (
        <div className="rounded-lg bg-gold-end/10 p-3 text-center text-sm text-gold-start">
          <p>
            모든 강의를 완료하셨습니다! 위의 수료증 발급 버튼을 클릭하여
            수료증을 받으세요.
          </p>
        </div>
      )}

      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        userName={userName}
        categoryName={categoryName}
        completedCount={completedCourses}
        totalCount={totalCourses}
      />
    </div>
  );
}
