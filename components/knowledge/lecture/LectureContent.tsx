'use client';

import { MouseEvent, useEffect, useState } from 'react';
import EnrollBar from './EnrollBar';
import ReviewSection from './ReviewSection';
import { createClient } from '@/utils/supabase/client';
import { Lecture } from '@/app/types/knowledge/lecture';
import ShareButton from './ShareButton';
import BookmarkButton from './BookmarkButton';
import Link from 'next/link';
import {
  Book,
  ChevronRight,
  Clock,
  Play,
  Star,
  User,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth';
import { useToast } from '@/components/common/Toast/Context';
import { fetchAverageRating } from '@/utils/services/knowledge/lectureService';

interface LectureContentProps {
  lecture: Lecture;
}

interface LectureItem {
  id: number;
  title: string;
  type: 'video' | 'text';
  duration?: string;
  order_num?: number;
}

interface LectureSection {
  id: number;
  title: string;
  order_num: number;
  lecture_items: LectureItem[];
}

export default function LectureContent({ lecture }: LectureContentProps) {
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [sections, setSections] = useState<LectureSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [averageRating] = await Promise.all([
          fetchAverageRating(lecture.id),
        ]);
        setAverageRating(averageRating);

        const supabase = createClient();

        // 로그인한 경우 북마크 상태와 수강 상태 확인
        if (user) {
          // 북마크 상태 확인
          const { data: bookmark } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('lecture_id', lecture.id)
            .eq('user_id', user.id)
            .maybeSingle();

          setIsBookmarked(!!bookmark);
        }

        // 수강평 정보 조회 (로그인 여부와 무관하게 처리)
        const { data: reviews, error: reviewError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('lecture_id', lecture.id);

        if (reviewError) throw reviewError;

        if (reviews) {
          const count = reviews.length;
          setReviewCount(count);
        }

        // 섹션 데이터 로드
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('lecture_sections')
          .select(
            `
            id, 
            title, 
            order_num, 
            lecture_items (
              id, 
              title, 
              type, 
              duration
            )
          `
          )
          .eq('lecture_id', lecture.id)
          .order('order_num');

        if (sectionsError) throw sectionsError;

        // 섹션 내 아이템도 정렬
        const formattedSections = sectionsData?.map((section) => ({
          ...section,
          lecture_items: section.lecture_items?.sort(
            (a: LectureItem, b: LectureItem) =>
              (a.order_num || 0) - (b.order_num || 0)
          ),
        }));

        setSections(formattedSections || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [lecture.id, user]);

  const handleWatchClick = (e: MouseEvent) => {
    if (!user) {
      e.preventDefault();
      showToast('수강신청이 필요합니다.', 'error');
    }
  };

  // 총 강의 시간 계산
  const getTotalDuration = () => {
    let totalMinutes = 0;
    sections.forEach((section: LectureSection) => {
      section.lecture_items?.forEach((item: LectureItem) => {
        if (item.type === 'video' && item.duration) {
          // 00:00 형식 처리
          const parts = item.duration.split(':');
          if (parts.length === 2) {
            totalMinutes += parseInt(parts[0]) * 60 + parseInt(parts[1]);
          } else {
            // 초 단위로 입력된 경우
            totalMinutes += Math.floor(parseInt(item.duration || '0') / 60);
          }
        }
      });
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}시간 ${minutes > 0 ? `${minutes}분` : ''}`;
    }
    return `${minutes}분`;
  };

  // 총 강의 개수
  const getTotalLectureCount = () => {
    let count = 0;
    sections.forEach((section) => {
      count += section.lecture_items?.length || 0;
    });
    return count;
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* 상단 배너 영역 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:py-12">
            <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
              {/* 강의 정보 */}
              <div className="order-2 md:order-1">
                <div className="mb-1 flex items-center space-x-2 text-blue-200">
                  <span>{lecture.category}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>{lecture.depth}</span>
                </div>
                <h1 className="mb-4 text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
                  {lecture.title}
                </h1>

                <p className="mb-6 text-lg text-blue-100">{lecture.keyword}</p>

                <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
                  {!isLoading && (
                    <>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{getTotalDuration()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Book className="h-4 w-4" />
                        <span>{getTotalLectureCount()}개 강의</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{lecture.students}명 수강중</span>
                  </div>
                  {reviewCount >= 1 ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>
                        {averageRating.toFixed(1)} ({reviewCount}개 평가)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span>평가 없음</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>
                      <span className="font-semibold">
                        {lecture.instructor}
                      </span>{' '}
                      강사
                    </span>
                  </div>
                </div>

                {user ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <BookmarkButton
                      lectureId={lecture.id}
                      initialIsBookmarked={isBookmarked}
                    />
                    <ShareButton lectureId={lecture.id} />
                  </div>
                ) : (
                  <div className="mt-6">
                    <ShareButton lectureId={lecture.id} />
                  </div>
                )}
              </div>

              {/* 강의 썸네일/비디오 */}
              <div className="order-1 md:order-2">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900 shadow-lg">
                  <Link
                    href={`/knowledge/lecture/${lecture.id}/watch`}
                    onClick={handleWatchClick}
                  >
                    <div className="group relative h-full w-full">
                      {lecture.thumbnail_url ? (
                        <Image
                          src={lecture.thumbnail_url}
                          alt={lecture.title}
                          fill
                          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-800">
                          <Book className="h-16 w-16 text-gray-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                          <Play className="h-8 w-8 fill-white text-white" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* 왼쪽 섹션: 강의 설명 및 커리큘럼 */}
            <div className="lg:col-span-2">
              {/* 강의 소개 */}
              <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold">강의 소개</h2>
                <div className="prose max-w-none">
                  {/* 가상의 강의 소개 텍스트 - 실제로는 lecture.description 등에서 가져와야 함 */}
                  <p className="text-gray-700">
                    이 강의에서는 {lecture.keyword}와 관련된 다양한 관점과
                    지식을 다룹니다.
                    {lecture.instructor} 강사의 깊이 있는 전문성과 함께{' '}
                    {lecture.category} 분야에 대한
                    {lecture.depth}적인 이해를 얻을 수 있습니다.
                  </p>
                </div>
              </div>

              {/* 커리큘럼 */}
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold">커리큘럼</h2>

                {isLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                  </div>
                ) : (
                  <div className="divide-y">
                    {sections.map((section, index) => (
                      <div key={section.id} className="py-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-lg font-medium">
                            섹션 {index + 1}: {section.title}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {section.lecture_items?.length || 0}개 강의
                          </span>
                        </div>

                        <div className="ml-4 space-y-2">
                          {section.lecture_items?.map(
                            (item: LectureItem, itemIndex: number) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                              >
                                <div className="flex items-center">
                                  <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700">
                                    {itemIndex + 1}
                                  </span>
                                  <div>
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-xs text-gray-500">
                                      {item.type === 'video'
                                        ? '동영상'
                                        : '텍스트'}
                                      {item.duration &&
                                        item.type === 'video' &&
                                        ` • ${item.duration}`}
                                    </p>
                                  </div>
                                </div>
                                {item.type === 'video' && (
                                  <Play className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 오른쪽 섹션: 강사 정보 및 기타 정보 */}
            <div className="hidden lg:block">
              {/* 강사 정보 */}
              <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold">강사 소개</h2>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-medium">{lecture.instructor}</h3>
                    <p className="text-sm text-gray-500">
                      {lecture.category} 전문가
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-700">
                  <p>
                    {lecture.instructor} 강사는 {lecture.category} 분야에서
                    풍부한 경험을 가지고 있습니다.
                  </p>
                </div>
              </div>

              {/* 강의 정보 카드 */}
              <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold">강의 정보</h2>
                <div className="space-y-3">{/* 정보 내용 */}</div>
              </div>

              {/* 강의 시작하기 버튼 */}
              {user && (
                <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
                  <Link
                    href={`/knowledge/lecture/${lecture.id}/watch`}
                    className="block w-full rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3 text-center font-medium text-white shadow-md hover:from-purple-600 hover:to-indigo-700"
                  >
                    학습하기
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 수강평 */}
          <div className="mt-12">
            <ReviewSection lectureId={lecture.id} />
          </div>
        </div>

        {/* 수강신청 바 (항상 표시) */}
        <EnrollBar lectureId={Number(lecture.id)} />
      </div>
    </>
  );
}
