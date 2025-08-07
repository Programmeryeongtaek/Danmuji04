'use client';

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { Award, X } from 'lucide-react';
import Button from '../common/Button/Button';
import { formatDate } from '@/utils/helpers/formatDate';
import { useToast } from '../common/Toast/Context';
import { generateCertificate } from '@/utils/services/certificate/certificateService';
import {
  convertCategoryToKey,
  updateCategoryMap,
} from '@/utils/services/category/categoryService';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();
  const completionDate = formatDate(new Date());

  // 컴포넌트 마운트 시 카테고리 매핑 업데이트
  useEffect(() => {
    // 카테고리 매핑 최신화
    updateCategoryMap()
      .then(() => console.log('카테고리 매핑 업데이트 완료'))
      .catch((error) => console.error('카테고리 매핑 업데이트 실패:', error));
  }, []);

  // 수료증 발급 처리 함수
  const handleGenerateCertificate = async () => {
    try {
      setIsProcessing(true);

      // 카테고리 매핑 최신화 (새로운 카테고리가 추가되었을 수 있음)
      await updateCategoryMap();

      // 카테고리를 영어 key로 변환
      const categoryKey = convertCategoryToKey(categoryName);

      // 수료증 발급 서비스 호출
      const success = await generateCertificate(categoryKey);

      if (success) {
        showToast('수료증이 발급되었습니다!', 'success');
        onClose();
      } else {
        showToast('수료증 발급에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('수료증 발급 중 오류:', error);
      showToast('수료증 발급 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

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
            onClick={handleGenerateCertificate}
            className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            <Award size={18} />
            {isProcessing ? '발급 중...' : '수료증 발급받기'}
          </Button>
        </div>
      </div>
    </Modal.Root>
  );
}
