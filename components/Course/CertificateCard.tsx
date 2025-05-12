'use client';

import {
  COURSE_CATEGORIES,
  CourseCategory,
} from '@/app/types/course/categories';
import { Certificate } from '@/app/types/certificate/certificateTypes';
import { formatDate } from '@/utils/helpers/formatDate';
import { Award, Download, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import Button from '../common/Button/Button';

interface CertificateCardProps {
  certificate: Certificate;
  userName: string;
  onRefresh: () => Promise<boolean>;
  onDownload: () => void;
}

export function CertificateCard({
  certificate,
  userName,
  onRefresh,
  onDownload,
}: CertificateCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categoryTitle =
    COURSE_CATEGORIES[certificate.category as CourseCategory]?.title ||
    certificate.category;
  const issuedDate = formatDate(new Date(certificate.issued_at));
  const updatedDate = certificate.updated_at
    ? formatDate(new Date(certificate.updated_at))
    : null;

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md transition-all hover:shadow-lg">
      {/* 갱신 필요 표시 */}
      {certificate.is_outdated && (
        <div className="absolute right-0 top-0 z-10 rounded-bl-lg bg-red-500 px-3 py-1 text-sm font-medium text-white">
          갱신 필요
        </div>
      )}

      <div className="p-6">
        <div className="mb-4 flex items-center justify-center">
          <Award className="h-16 w-16 text-gold-start" />
        </div>

        <h3 className="mb-2 text-center text-lg font-bold">
          {COURSE_CATEGORIES[certificate.category as CourseCategory]?.title ||
            certificate.category}{' '}
          수료증
        </h3>

        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="mb-2 text-lg font-semibold">{userName} 님</p>
          <p className="mb-4 text-gray-600">
            {`단무지 ${categoryTitle} 과정을 성공적으로 수료하셨습니다.`}
          </p>
          <div className="text-sm text-gray-500">
            <p>발급일: {issuedDate}</p>
            {updatedDate && <p>갱신일: {updatedDate}</p>}
          </div>
        </div>

        <div className="flex justify-between gap-2">
          {/* 수료증이 갱신 필요한 경우에만 갱신 버튼 표시 */}
          {certificate.is_outdated ? (
            <Button
              onClick={handleRefresh}
              className="flex flex-1 items-center justify-center gap-2 py-2"
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? '갱신 중...' : '수료증 갱신'}
            </Button>
          ) : (
            <Button
              onClick={onDownload}
              className="flex flex-1 items-center justify-center gap-2 py-2"
            >
              <Download className="h-4 w-4" />
              다운로드
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
