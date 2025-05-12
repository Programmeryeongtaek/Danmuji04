'use client';

import LectureManageButtons from '@/components/My/LectureManageButtons';
import { useToast } from '@/components/common/Toast/Context';
import {
  LectureDetail,
  LectureItem,
  LectureSection,
} from '@/app/types/knowledge/lectureForm';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LectureManagePage() {
  const params = useParams();
  const [lecture, setLecture] = useState<LectureDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchLecture = async () => {
      try {
        const supabase = createClient();

        // 강의 정보와 섹션, 아이템 정보를 한 번에 가져옴
        const { data, error } = await supabase
          .from('lectures')
          .select(
            `
            *,
            lecture_sections (
              *,
              lecture_items (*)
            )
          `
          )
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setLecture(data);
      } catch (error) {
        console.error('Error fetching lecture:', error);
        showToast('강의 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLecture();
  }, [params.id, showToast]);

  if (isLoading) return <div>로딩 중...</div>;
  if (!lecture) return <div>강의를 찾을 수 없습니다.</div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">강의 관리</h1>
        <LectureManageButtons
          lectureId={lecture.id}
          instructor={lecture.instructor}
        />
      </div>

      <div className="space-y-6">
        {/* 강의 기본 정보 */}
        <div className="rounded-lg border p-6">
          {lecture.thumbnail_url && (
            <div className="relative mb-4 h-64 w-full overflow-hidden rounded-lg">
              <Image
                src={lecture.thumbnail_url}
                alt={lecture.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">제목:</span> {lecture.title}
            </div>
            <div>
              <span className="font-medium">카테고리:</span> {lecture.category}
            </div>
            <div>
              <span className="font-medium">난이도:</span> {lecture.depth}
            </div>
            <div>
              <span className="font-medium">형태:</span> {lecture.group_type}
            </div>
            <div>
              <span className="font-medium">가격:</span>{' '}
              {lecture.is_free ? '무료' : `${lecture.price.toLocaleString()}원`}
            </div>
          </div>
        </div>

        {/* 섹션 & 강의 목록 */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">커리큘럼</h2>
          {lecture.lecture_sections?.map((section: LectureSection) => (
            <div key={section.id} className="rounded-lg border p-4">
              <h3 className="mb-4 text-lg font-medium">{section.title}</h3>
              <div className="space-y-2">
                {section.lecture_items?.map((item: LectureItem) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                  >
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-gray-500">
                        {item.type === 'video' ? '동영상' : '텍스트'}
                      </div>
                    </div>
                    {item.duration && (
                      <div className="text-sm text-gray-500">
                        {item.duration}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
