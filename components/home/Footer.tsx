'use client';

import {
  Book,
  BookOpen,
  HelpCircle,
  Mail,
  MessageSquare,
  Users,
} from 'lucide-react';
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
            <div className="flex gap-4">
              <a
                href="mailto:yeongtaek2109@gmail.com"
                className="text-gray-500 hover:text-gold-start"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* 주요 메뉴 */}
          <div>
            <h3 className="mb-4 text-lg font-bold">주요 메뉴</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/knowledge"
                  className="flex items-center gap-2 text-gray-600 hover:text-gold-start"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>지식</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/course"
                  className="flex items-center gap-2 text-gray-600 hover:text-gold-start"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>코스</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/study"
                  className="flex items-center gap-2 text-gray-600 hover:text-gold-start"
                >
                  <Users className="h-4 w-4" />
                  <span>스터디</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/community"
                  className="flex items-center gap-2 text-gray-600 hover:text-gold-start"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>커뮤니티</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/study?category=book"
                  className="flex items-center gap-2 text-gray-600 hover:text-gold-start"
                >
                  <Book className="h-4 w-4" />
                  <span>도서</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 서비스 카테고리 */}
          <div>
            <h3 className="mb-4 text-lg font-bold">학습 카테고리</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/course/reading"
                  className="text-gray-600 hover:text-gold-start"
                >
                  독서
                </Link>
              </li>
              <li>
                <Link
                  href="/course/writing"
                  className="text-gray-600 hover:text-gold-start"
                >
                  글쓰기
                </Link>
              </li>
              <li>
                <Link
                  href="/course/question"
                  className="text-gray-600 hover:text-gold-start"
                >
                  질문
                </Link>
              </li>
              <li>
                <Link
                  href="/knowledge?category=philosophy"
                  className="text-gray-600 hover:text-gold-start"
                >
                  철학
                </Link>
              </li>
              <li>
                <Link
                  href="/knowledge?category=psychology"
                  className="text-gray-600 hover:text-gold-start"
                >
                  심리학
                </Link>
              </li>
              <li>
                <Link
                  href="/knowledge?category=economics"
                  className="text-gray-600 hover:text-gold-start"
                >
                  경제학
                </Link>
              </li>
            </ul>
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
                  href="/terms"
                  className="text-gray-600 hover:text-gold-start"
                >
                  이용약관
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-600 hover:text-gold-start"
                >
                  개인정보처리방침
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
