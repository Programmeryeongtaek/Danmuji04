'use client';

import {
  BookOpen,
  GraduationCap,
  LucideUsers,
  PenTool,
  Target,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function IntroducePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 lg:px-8">
      {/* 히어로 섹션 */}
      <section className="mb-16 flex flex-col items-center justify-between gap-8 md:flex-row">
        <div className="flex-1">
          <h1 className="mb-4 text-4xl font-bold">
            <span className="bg-gradient-to-r from-gold-start to-gold-end bg-clip-text text-transparent">
              단무지
            </span>
            와 함께하는 학습 여정
          </h1>
          <p className="mb-6 text-lg text-gray-600">
            지식의 무지함을 끊고, 체계적인 학습을 통해 진정한 성장을
            이루어보세요. 단무지는 다양한 분야의 지식을 탐색하고 배울 수 있는
            온라인 학습 플랫폼입니다.
          </p>
          <div className="flex gap-4">
            <Link
              href="/knowledge"
              className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-6 py-3 text-white hover:opacity-90"
            >
              지식 탐색하기
            </Link>
            <Link
              href="/course"
              className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50"
            >
              코스 둘러보기
            </Link>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative h-64 w-full overflow-hidden rounded-lg shadow-xl md:h-80">
            <Image
              src="/images/danmuji.png"
              alt="단무지 학습 플랫폼"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* 단무지 설명 섹션 */}
      <section className="mb-16">
        <div className="mb-8 text-center">
          <h2 className="mb-4 text-3xl font-bold">단무지란?</h2>
          <p className="mx-auto max-w-2xl text-gray-600">
            끊을 <strong>단(斷)</strong>과 <strong>무지(無知)</strong>를 합쳐{' '}
            <br />
            <strong>무지를 끊는다</strong>는 의미를 갖습니다. <br />
            공부를 하면서 모르는 것을 알아가는 것, <br />
            그리고 끊임없이 공부해 나가는 것이 <br />
            무지를 끊는 과정이라 말할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-6 transition-shadow hover:shadow-md">
            <div className="mb-4 inline-block rounded-full bg-blue-100 p-3">
              <BookOpen className="h-7 w-7 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">다양한 지식</h3>
            <p className="text-gray-600">
              인문학, 철학, 심리학, 경제학 등 다양한 분야의 강의를 제공합니다.
              폭넓은 지식으로 시야를 넓혀보세요.
            </p>
          </div>

          <div className="rounded-lg border p-6 transition-shadow hover:shadow-md">
            <div className="mb-4 inline-block rounded-full bg-green-100 p-3">
              <GraduationCap className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">체계적인 코스</h3>
            <p className="text-gray-600">
              단계별로 구성된 코스를 통해 기초부터 심화 지식까지 체계적으로
              학습할 수 있습니다.
            </p>
          </div>

          <div className="rounded-lg border p-6 transition-shadow hover:shadow-md">
            <div className="mb-4 inline-block rounded-full bg-purple-100 p-3">
              <LucideUsers className="h-7 w-7 text-purple-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">함께하는 학습</h3>
            <p className="text-gray-600">
              다른 학습자들과 의견을 나누고 토론하며 더 깊은 이해와 다양한
              관점을 경험하세요.
            </p>
          </div>
        </div>
      </section>

      {/* 핵심 가치 섹션 */}
      <section className="mb-16 rounded-xl bg-gray-50 p-8">
        <h2 className="mb-8 text-center text-3xl font-bold">
          단무지의 핵심 가치
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex gap-4">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-start text-white">
                <Target className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-medium">성장 지향적 학습</h3>
              <p className="text-gray-600">
                단순한 지식 전달을 넘어 실제 삶에 적용할 수 있는 성장 지향적
                학습 경험을 제공합니다.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-start text-white">
                <PenTool className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-medium">비판적 사고</h3>
              <p className="text-gray-600">
                주입식 학습이 아닌, 스스로 생각하고 질문하며 비판적 사고력을
                기를 수 있도록 돕습니다.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-start text-white">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-medium">다양성 존중</h3>
              <p className="text-gray-600">
                다양한 분야와 관점의 지식을 탐구하며 풍부한 사고와 열린 마음을
                길러나갑니다.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-start text-white">
                <LucideUsers className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-medium">지식 공유</h3>
              <p className="text-gray-600">
                배움은 혼자만의 여정이 아닙니다. 함께 나누고 토론하며 더 큰
                가치를 만들어냅니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="rounded-xl bg-gradient-to-r from-gold-start to-gold-end p-8 text-white">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <h2 className="mb-2 text-2xl font-bold">
              지금 단무지와 함께 시작하세요
            </h2>
            <p>다양한 강의와 코스가 여러분을 기다리고 있습니다.</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="rounded-lg bg-white px-4 py-2 font-medium text-gold-start"
            >
              홈페이지 둘러보기
            </Link>
            <Link
              href="/signup"
              className="rounded-lg border border-white px-4 py-2 font-medium text-white hover:bg-white/10"
            >
              회원가입
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
