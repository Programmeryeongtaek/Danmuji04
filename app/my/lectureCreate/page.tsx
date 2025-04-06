'use client';

import { LectureItemForm } from '@/components/common/My/LectureItemForm';
import { useLectureForm } from '@/hooks/useLectureForm';
import {
  CATEGORY_OPTIONS,
  DEPTH_OPTIONS,
  GROUP_TYPE_OPTIONS,
  LectureFormData,
  LectureSectionFormData,
} from '@/types/lectureFrom';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

export default function CreateLectureForm() {
  const router = useRouter();
  const { isSubmitting, thumbnail, setThumbnail, createLecture } =
    useLectureForm();
  const [sections, setSections] = useState<LectureSectionFormData[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(e.currentTarget);

    try {
      const lectureData: LectureFormData = {
        title: formData.get('title') as string,
        category: formData.get('category') as string,
        instructor: formData.get('instructor') as string,
        depth: formData.get('depth') as LectureFormData['depth'],
        keyword: formData.get('keyword') as string,
        group_type: formData.get('group_type') as LectureFormData['group_type'],
        is_public: formData.get('isPublic') === 'true',
        is_free: formData.get('isFree') === 'true',
        price: parseInt(formData.get('price') as string) || 0,
        ...(thumbnail && { thumbnailUrl: URL.createObjectURL(thumbnail) }),
      };

      const lecture = await createLecture(lectureData, sections);
      router.push(`/my/lectures/${lecture.id}/manage`);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      // 이미지 미리보기 URL 생성성
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    }
  };

  // cleanup
  useEffect(() => {
    return () => {
      // 컴포넌트 unmount 시 미리보기 URL 해제
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

  // 아이템 추가 시
  const addItem = (sectionIndex: number) => {
    setSections((prev) => {
      const newSections = [...prev];
      if (!Array.isArray(newSections[sectionIndex].items)) {
        newSections[sectionIndex].items = [];
      }
      newSections[sectionIndex].items.push({
        title: '',
        type: 'video',
        content_url: '',
        duration: '',
        orderNum: newSections[sectionIndex].items.length + 1,
      });
      return newSections;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">새 강의 등록</h1>

        {/* 기본 정보 */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">강의 제목</label>
            <input
              type="text"
              name="title"
              required
              className="w-full rounded-lg border p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">카테고리</label>
              <select
                name="category"
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
                <input type="checkbox" name="is_public" value="true" />
                <span className="text-sm">공개 강의로 설정</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_free"
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
                defaultValue="0"
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
                onClick={() => addItem(sectionIndex)}
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
          {isSubmitting ? '등록 중...' : '강의 등록'}
        </button>
      </div>
    </form>
  );
}
