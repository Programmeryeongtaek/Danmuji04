'use client';

import { LectureItemForm } from '@/components/common/My/LectureItemForm';
import { useLectureForm } from '@/hooks/useLectureForm';
import {
  CATEGORY_OPTIONS,
  DEPTH_OPTIONS,
  GROUP_TYPE_OPTIONS,
  LectureDBItem,
  LectureDBSection,
  LectureFormData,
  LectureSectionFormData,
} from '@/types/lectureFrom';
import { createClient } from '@/utils/supabase/client';
import { X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

export default function EditLectureForm() {
  const router = useRouter();
  const params = useParams();
  const { isSubmitting, thumbnail, setThumbnail, updateLecture } =
    useLectureForm();
  const [sections, setSections] = useState<LectureSectionFormData[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<LectureFormData | null>(null);

  // 기존 강의 데이터 불러오기
  useEffect(() => {
    const fetchLecture = async () => {
      try {
        const supabase = createClient();
        const { data: lecture, error } = await supabase
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

        // 초기 데이터 설정
        setInitialData({
          title: lecture.title,
          category: lecture.category,
          instructor: lecture.instructor,
          depth: lecture.depth,
          keyword: lecture.keyword,
          group_type: lecture.group_type,
          is_public: lecture.is_public,
          is_free: lecture.is_free,
          price: lecture.price,
          thumbnail_url: lecture.thumbnail_url,
        });

        // 섹션 데이터 설정
        const formattedSections = lecture.lecture_sections.map(
          (section: LectureDBSection) => ({
            title: section.title,
            orderNum: section.order_num,
            items: section.lecture_items.map((item: LectureDBItem) => ({
              title: item.title,
              type: item.type,
              content_url: item.content_url,
              duration: item.duration,
              orderNum: item.order_num,
            })),
          })
        );

        setSections(formattedSections);
        setThumbnailPreview(lecture.thumbnail_url);
      } catch (error) {
        console.error('Error fetching lecture:', error);
      }
    };

    fetchLecture();
  }, [params.id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('로그인이 필요합니다.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('프로필 정보를 찾을 수 없습니다.');

      // form 요소를 직접 가져오기
      const form = document.querySelector('form');
      if (!form) throw new Error('폼을 찾을 수 없습니다.');

      const formData = new FormData(form);
      const instructorName = profile.nickname || profile.name;

      const lectureData: LectureFormData = {
        title: formData.get('title') as string,
        category: formData.get('category') as string,
        instructor: instructorName,
        depth: formData.get('depth') as LectureFormData['depth'],
        keyword: formData.get('keyword') as string,
        group_type: formData.get('group_type') as LectureFormData['group_type'],
        is_public: formData.get('is_public') === 'true',
        is_free: formData.get('is_free') === 'true',
        price: parseInt(formData.get('price') as string) || 0,
        ...(thumbnail && { thumbnailUrl: URL.createObjectURL(thumbnail) }),
      };

      await updateLecture(Number(params.id), lectureData, sections);
      router.push(`/my/lectures/${params.id}/manage`);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: '',
        orderNum: prev.length + 1,
        items: [],
      },
    ]);
  };

  if (!initialData) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">강의 수정</h1>

        {/* 기본 정보 */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">강의 제목</label>
            <input
              type="text"
              name="title"
              defaultValue={initialData.title}
              required
              className="w-full rounded-lg border p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">카테고리</label>
              <select
                name="category"
                defaultValue={initialData.category}
                required
                className="w-full rounded-lg border p-2"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">난이도</label>
              <select
                name="depth"
                defaultValue={initialData.depth}
                required
                className="w-full rounded-lg border p-2"
              >
                {DEPTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">키워드</label>
            <input
              type="text"
              name="keyword"
              defaultValue={initialData.keyword}
              required
              className="w-full rounded-lg border p-2"
              placeholder="키워드를 입력해주세요 (쉼표로 구분)"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">썸네일</label>
            <div className="space-y-2">
              {thumbnailPreview && (
                <div className="relative h-32 w-48">
                  <img
                    src={thumbnailPreview}
                    alt="썸네일 미리보기"
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnail(null);
                      setThumbnailPreview(null);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                권장 크기: 1280x720px (16:9 비율)
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">모임 형태</label>
            <select
              name="group_type"
              defaultValue={initialData.group_type}
              required
              className="w-full rounded-lg border p-2"
            >
              {GROUP_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_public"
                  defaultChecked={initialData.is_public}
                  value="true"
                />
                <span className="text-sm">공개 강의로 설정</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_free"
                  defaultChecked={initialData.is_free}
                  value="true"
                  onChange={(e) => {
                    const priceInput = document.querySelector(
                      'input[name="price"]'
                    ) as HTMLInputElement;
                    if (priceInput) {
                      priceInput.disabled = e.target.checked;
                      if (e.target.checked) {
                        priceInput.value = '0';
                      }
                    }
                  }}
                />
                <span className="text-sm">무료 강의로 설정</span>
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                가격 설정
              </label>
              <input
                type="number"
                name="price"
                min="0"
                step="1000"
                defaultValue={initialData.price}
                disabled={initialData.is_free}
                className="w-full rounded-lg border p-2"
                placeholder="가격을 입력해주세요 (무료인 경우 0)"
              />
              <p className="mt-1 text-sm text-gray-500">
                1,000원 단위로 입력해주세요
              </p>
            </div>
          </div>
        </div>

        {/* 섹션 목록 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">강의 섹션</h2>
            <button
              type="button"
              onClick={addSection}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white"
            >
              섹션 추가
            </button>
          </div>

          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => {
                    const newSections = [...sections];
                    newSections[sectionIndex].title = e.target.value;
                    setSections(newSections);
                  }}
                  className="flex-1 rounded border p-2"
                  placeholder="섹션 제목"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newSections = sections.filter(
                      (_, i) => i !== sectionIndex
                    );
                    setSections(newSections);
                  }}
                  className="rounded-full p-1 text-red-500 hover:bg-red-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 아이템 목록 */}
              <div className="mb-4 space-y-4">
                {section.items.map((item, itemIndex) => (
                  <LectureItemForm
                    key={itemIndex}
                    sectionIndex={sectionIndex}
                    itemIndex={itemIndex}
                    item={item}
                    onUpdate={(sectionIndex, itemIndex, updatedItem) => {
                      const newSections = [...sections];
                      newSections[sectionIndex].items[itemIndex] = updatedItem;
                      setSections(newSections);
                    }}
                    onDelete={(sectionIndex, itemIndex) => {
                      const newSections = [...sections];
                      newSections[sectionIndex].items = section.items.filter(
                        (_, i) => i !== itemIndex
                      );
                      setSections(newSections);
                    }}
                  />
                ))}
              </div>

              {/* 아이템 추가 버튼 */}
              <button
                type="button"
                onClick={() => {
                  const newSections = [...sections];
                  newSections[sectionIndex].items.push({
                    title: '',
                    type: 'video',
                    orderNum: section.items.length + 1,
                  });
                  setSections(newSections);
                }}
                className="w-full rounded-lg border-2 border-dashed py-2 text-gray-500 hover:bg-gray-50"
              >
                + 강의 추가
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-6 py-2"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-500 px-6 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? '수정 중...' : '강의 수정'}
        </button>
      </div>
    </form>
  );
}
