'use client';

import { useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { Facebook, Link, Twitter } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  description?: string;
  url: string; // 공유할 페이지 URL
}

export default function ShareButton({ title, url }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();

  // 현재 URL이 없다면 현재 페이지 URL 사용
  const shareUrl =
    url || (typeof window !== 'undefined' ? window.location.href : '');

  // 클 립보드에 링크 복사
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
    const facebookUrl = `https://www.facbook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(title)}`;
    window.open(facebookUrl, '_black', 'width=600,height=400');
    setIsOpen(false);
  };

  // 트위터 공유
  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg text-gray-700 hover:text-gold-start"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        <span>공유하기</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="flex flex-col gap-1">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100"
            >
              <Link className="h-5 w-5" />
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
          </div>
        </div>
      )}
    </div>
  );
}
