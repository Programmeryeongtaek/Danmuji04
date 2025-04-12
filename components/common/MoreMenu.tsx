'use client';

import {
  AlertCircle,
  BookOpen,
  HelpCircle,
  Mail,
  MessageCircle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MoreMenu({ isOpen, onClose }: MoreMenuProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showBackdrop, setShowBackdrop] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => setShowBackdrop(true), 10);
    } else {
      document.body.style.overflow = 'auto';
      setShowBackdrop(false);
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const menuItems = [
    [
      {
        icon: HelpCircle,
        label: '질문 게시판',
        href: '/community/faq',
      },
      {
        icon: MessageCircle,
        label: '자유게시판',
        href: '/community/chats',
      },
      {
        icon: BookOpen,
        label: '스터디',
        href: '/community/study',
      },
    ],
    [
      { icon: AlertCircle, label: '공지사항', href: '/community/notice' },
      { icon: Mail, label: '문의하기', href: '/contact' },
      { icon: null, label: '', href: '#' },
    ],
  ];

  if (!isMounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-300 ${
        isOpen ? 'visible' : 'invisible'
      }`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          showBackdrop ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Menu Content */}
      <div
        className={`relative w-full max-w-md rounded-t-xl bg-white transition-transform duration-300 ${
          showBackdrop ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>

        {/* Grid Menu */}
        <div className="p-6">
          {menuItems.map((row, rowIndex) => (
            <div key={rowIndex} className="mb-8 grid grid-cols-3 gap-4">
              {row.map((item, colIndex) =>
                item.icon ? (
                  <Link
                    key={colIndex}
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-2 text-center"
                    onClick={onClose}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                      <item.icon className="h-6 w-6 text-gray-700" />
                    </div>
                    <span className="text-sm text-gray-800">{item.label}</span>
                  </Link>
                ) : (
                  <div key={colIndex} className="flex-1"></div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
