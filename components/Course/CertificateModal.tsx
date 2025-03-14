'use client';

import { useState } from 'react';
import Modal from '../common/Modal';
import { Award, Download, X } from 'lucide-react';
import Button from '../common/Button/Button';
import { formatDate } from '@/utils/formatDate';
import { useToast } from '../common/Toast/Context';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  categoryName: string;
  completedCount: number;
  totalCount: number;
}

export function CertificateModal({
  isOpen,
  onClose,
  userName,
  categoryName,
  completedCount,
  totalCount,
}: CertificateModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { showToast } = useToast();
  const completionDate = formatDate(new Date());

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      // 여기에 수료증 다운로드 로직을 구현할 수 있다.
      // ex. PDF 생성 및 다운로드

      // 임시로 타이머 사용
      await new Promise((resolve) => setTimeout(resolve, 1500));

      showToast('수료증이 다운로드되었습니다.', 'success');
      onClose();
    } catch (error) {
      console.error('수료증 다운로드 중 오류 발생:', error);
      showToast('수료증 다운로드에 실패했습니다', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal.Root isOpen={isOpen} onClose={onClose}>
      <div className="relative rounded-lg bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center justify-center">
          <Award className="h-16 w-16 text-gold-start" />
        </div>

        <h2 className="mb-4 text-center text-xl font-bold text-gray-900">
          축하합니다! 수료증을 발급받으세요.
        </h2>

        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="mb-2 text-lg font-semibold">{userName} 님</p>
          <p className="mb-4 text-gray-600">
            단무지 {categoryName} 과정을 성공적으로 수료하셨습니다.
          </p>
          <div className="mb-2 text-sm text-gray-500">
            <span>
              총 {totalCount}개 중 {completedCount}개 완료
            </span>
          </div>
          <div className="text-sm text-gray-500">
            <span>수료일: {completionDate}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-2"
            disabled={isDownloading}
          >
            <Download size={18} />
            {isDownloading ? '다운로드 중...' : '수료증 다운로드'}
          </Button>
        </div>
      </div>
    </Modal.Root>
  );
}
