'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import { ToastType } from '@/components/common/Toast/type';

import { Share } from 'lucide-react';

interface ShareButtonProps {
  lectureId: number;
}

const ShareButton = ({ lectureId }: ShareButtonProps) => {
  const { showToast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}/knowledge/lecture/${lectureId}`;

    try {
      await navigator.clipboard.writeText(url);
      showToast('링크가 복사되었습니다.', 'success' as ToastType);
    } catch (error) {
      showToast('공유하기에 실패했습니다.', error as ToastType);
    }
  };

  return (
    <Button onClick={handleShare}>
      <Share className="h-5 w-5" />
    </Button>
  );
};

export default ShareButton;
