'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { Facebook, LinkIcon, Mail, Share2, Twitter } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  description?: string;
  url?: string; // 공유할 페이지 URL (없으면 현재 URL 사용)
  image?: string; // 공유 시 표시될 이미지 URL (옵션)
}

export default function ShareButton({
  title,
  description = '',
  url,
}: ShareButtonProps) {
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

  // 페이스북 공유
  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(title)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  // 트위터 공유
  const shareToTwitter = () => {
    const twitterText = `${title}${description ? ` - ${description}` : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  // 이메일 공유
  const shareByEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(
      `${title}\n\n${description}\n\n${shareUrl}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setIsOpen(false);
  };

  // 네이티브 공유 API 사용 (모바일 기기에서 지원)
  const useNativeShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: title,
          text: description,
          url: shareUrl,
        })
        .then(() => {
          console.log('공유 성공');
          setIsOpen(false);
        })
        .catch((error) => {
          console.log('공유 실패:', error);
        });
    } else {
      showToast('이 브라우저는 공유 기능을 지원하지 않습니다.', 'error');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
        aria-label="공유하기"
      >
        <Share2 className="h-4 w-4" />
        <span>공유하기</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="flex flex-col gap-1">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100"
            >
              <LinkIcon className="h-5 w-5 text-gray-600" />
              <span>링크 복사</span>
            </button>
            <button
              onClick={shareToFacebook}
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100"
            >
              <Facebook className="h-5 w-5 text-blue-600" />
              <span>페이스북에 공유</span>
            </button>
            <button
              onClick={shareToTwitter}
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100"
            >
              <Twitter className="h-5 w-5 text-blue-400" />
              <span>트위터에 공유</span>
            </button>
            <button
              onClick={shareByEmail}
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100"
            >
              <Mail className="h-5 w-5 text-gray-600" />
              <span>이메일로 공유</span>
            </button>
            {navigator.share && (
              <button
                onClick={useNativeShare}
                className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100"
              >
                <Share2 className="h-5 w-5 text-green-600" />
                <span>기기 공유 기능 사용</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
