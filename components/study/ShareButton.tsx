'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { Share2 } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  description?: string;
  url?: string; // 공유할 페이지 URL (없으면 현재 URL 사용)
  image?: string; // 공유 시 표시될 이미지 URL (옵션)
}

export default function ShareButton({ url }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // 현재 URL이 없다면 현재 페이지 URL 사용
  const shareUrl =
    url || (typeof window !== 'undefined' ? window.location.href : '');

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 클립보드에 링크 복사
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        showToast('링크가 클립보드에 복사되었습니다.', 'success');
        setIsOpen(false);
      },
      () => {
        showToast('링크 복사에 실패했습니다.', 'error');
      }
    );
  };

  return (
    <button
      onClick={copyToClipboard}
      className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:border-gold-start hover:bg-gold-start hover:text-black"
      aria-label="공유하기"
    >
      <Share2 className="h-4 w-4" />
    </button>
  );
}
