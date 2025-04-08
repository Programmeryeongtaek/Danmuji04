'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useRef, useState } from 'react';

interface NavDropdownItemProps {
  id: string;
  label: string;
  href: string;
}

interface NavDropdownProps {
  title: string;
  href: string;
  items: NavDropdownItemProps[];
  children?: ReactNode;
}

const NavDropdown = ({ title, href, items, children }: NavDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100);
  };

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 타이머 정리
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={href}
        className="flex items-center whitespace-nowrap text-gray-700 hover:text-gold-start"
      >
        {title}
        <svg
          className={`ml-1 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </Link>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-md border border-gray-100 bg-white py-2 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gold-start"
            >
              {item.label}
            </Link>
          ))}
          {children}
        </div>
      )}
    </div>
  );
};

export default NavDropdown;
