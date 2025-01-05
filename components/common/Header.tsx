'use client';

import { Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import LoginModal from '../home/LoginModal';
import { useState } from 'react';
import Button from './Button/Button';

const Header = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <>
      <section className="flex h-10 w-full items-center bg-light">
        <header className="flex h-5 w-full justify-between px-8">
          <ul className="flex justify-between gap-1">
            <li className="flex justify-start">
              <Link
                href={'/introduce'}
                className="divide-y-black divide-black-200 flex gap-1"
              >
                {/* TODO: 사진 이미지 변경하기기 */}
                <Image
                  src={'/images/danmuji.png'}
                  alt="단무지"
                  width={20}
                  height={20}
                />
                <span>단무지</span>
              </Link>
            </li>
            {/* TODO: 수직 구분선 */}
            <li>임시1</li>
          </ul>
          <ul className="flex items-center gap-1">
            <li>임시2</li>
            {/* TODO: 수직 구분선 */}
            <li>임시3</li>
          </ul>
        </header>
      </section>
      <header className="border-title flex h-[50px] w-full items-center border-t bg-light">
        {/* TODO: navbar sticky 적용 */}
        <nav className="flex w-full justify-between px-8">
          <div>
            <div>
              {/* TODO: 누르면 왼쪽에서 슬라이드 열림*/}
              <Menu className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-gold-start to-gold-end bg-clip-text text-transparent">
            <Link href={'/'}>단무지</Link>
          </div>
          <div>
            {/* TODO: 로그인 누르면 간편 로그인 및 회원가입 모달창 */}
            <Button onClick={() => setIsLoginModalOpen(true)}>로그인</Button>
          </div>

          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
          />
        </nav>
      </header>
    </>
  );
};

export default Header;
