'use client';

import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-gold-start/10 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 grid gap-8 md:grid-cols-4">
          {/* 단무지 소개 */}
          <div>
            <h3 className="mb-4 text-lg font-bold">단무지</h3>
            <p className="mb-4 text-sm text-gray-600">
              함께 배우고 성장하는 지식 공유 플랫폼, 단무지에서 다양한 분야의
              지식을 얻고 커뮤니티와 함께 성장하세요.
            </p>
          </div>

          {/* 고객 지원 */}
          <div>
            <h3 className="mb-4 text-lg font-bold">고객 지원</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/community?category=notice"
                  className="text-gray-600 hover:text-gold-start"
                >
                  공지사항
                </Link>
              </li>
              <li>
                <Link
                  href="/community?category=faq"
                  className="text-gray-600 hover:text-gold-start"
                >
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-gold-start"
                >
                  문의하기
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-6 text-center text-sm text-gray-500">
          <p>&copy; {currentYear} 단무지. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
