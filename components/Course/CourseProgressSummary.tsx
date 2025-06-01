'use client';

import { Award, Book, Edit, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { CertificateModal } from './CertificateModal';
import { CourseCategory } from '@/app/types/course/categories';
import { useCertificate } from '@/hooks/useCertificate';
import { useToast } from '../common/Toast/Context';

interface CourseProgressSummaryProps {
  categoryName: string;
  totalCourses: number;
  completedCourses: number;
  completedWritings: number;
  userName: string;
  category: CourseCategory;
}

export default function CourseProgressSummary({
  categoryName,
  totalCourses,
  completedCourses,
  completedWritings,
  userName,
  category,
}: CourseProgressSummaryProps) {
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { certificate, refreshCertificate } = useCertificate(category);
  const { showToast } = useToast();

  const isAllCompleted =
    totalCourses > 0 &&
    completedCourses === totalCourses &&
    completedWritings === totalCourses;

  const progressPercentage =
    totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  const writingPercentage =
    totalCourses > 0 ? Math.round((completedWritings / totalCourses) * 100) : 0;

  // 수료증 클릭 핸들러
  const handleCertificateClick = async () => {
    if (!isAllCompleted) return;

    if (certificate && certificate.is_outdated) {
      // 수료증이 있지만 업데이트가 필요한 경우
      setIsRefreshing(true);
      try {
        const success = await refreshCertificate();
        if (success) {
          showToast('수료증이 성공적으로 갱신되었습니다.', 'success');
        }
      } catch (error) {
        console.error('수료증 갱신 중 오류:', error);
        showToast('수료증 갱신에 실패했습니다.', 'error');
      } finally {
        setIsRefreshing(false);
      }
    } else {
      // 수료증이 없거나 업데이트가 필요 없는 경우 모달 표시
      setShowCertificateModal(true);
    }
  };

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          {categoryName} 학습 진행상황
        </h3>
      </div>

      {/* 상세 정보 */}
      <>
        <div className="mb-4 grid gap-4 mobile:grid-cols-1 sm:grid-cols-2 laptop:grid-cols-3">
          {/* 학습 진행률 */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Book className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">학습 진행률</span>
              </div>
              <span className="font-semibold text-green-600">
                {progressPercentage}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
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
                <Edit className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">글작성 현황</span>
              </div>
              <span className="font-semibold text-blue-600">
                {writingPercentage}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
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
            onClick={handleCertificateClick}
          >
            {certificate && certificate.is_outdated ? (
              // 갱신 필요한 수료증
              <>
                <RefreshCw
                  className={`mb-2 h-10 w-10 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span className="text-center text-sm font-medium">
                  {isRefreshing ? '갱신 중...' : '수료증 갱신 필요!'}
                </span>
              </>
            ) : (
              // 일반 수료증 또는 발급 안됨
              <>
                <Award className="mb-2 h-10 w-10" />
                <span className="text-center text-sm font-medium">
                  {isAllCompleted
                    ? certificate
                      ? '수료증 보기'
                      : '수료증 발급 가능!'
                    : '모든 강의를 완료하면 수료증을 발급받을 수 있습니다'}
                </span>
              </>
            )}
          </div>
        </div>

        {isAllCompleted && (
          <div className="rounded-lg bg-gold-end/10 p-3 text-center text-sm text-gold-start">
            {certificate && certificate.is_outdated ? (
              <p>새로운 강의가 추가되었습니다! 수료증 갱신이 필요합니다.</p>
            ) : (
              <p>
                모든 강의를 완료하셨습니다!
                {certificate
                  ? ' 위의 수료증 아이콘을 클릭하여 수료증을 확인하세요.'
                  : ' 위의 수료증 발급 버튼을 클릭하여 수료증을 받으세요.'}
              </p>
            )}
          </div>
        )}
      </>

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
