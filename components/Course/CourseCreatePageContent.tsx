'use client';

import { useSearchParams } from 'next/navigation';
import { useToast } from '../common/Toast/Context';
import { FormEvent, useState } from 'react';
import {
  COURSE_CATEGORIES,
  CourseCategory,
  isValidCategory,
} from '@/app/types/course/categories';
import {
  CourseFormData,
  CourseItemFormData,
} from '@/app/types/course/courseModel';
import { createCourse } from '@/utils/services/course/courseService';
import { createCourseItem } from '@/utils/services/course/courseItemService';
import { ArrowLeft, PlusCircle, Trash2, X, Youtube } from 'lucide-react';
import Button from '../common/Button/Button';
import Link from 'next/link';

export default function CourseCreatePageContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const { showToast } = useToast();

  // 카테고리 관리
  const [category, setCategory] = useState<string>(
    isValidCategory(initialCategory) ? initialCategory : ''
  );
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  // 코스 아이템(강의) 관리
  const [courseItems, setCourseItems] = useState<CourseItemFormData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 빈 코스 아이템 추가
  const addCourseItem = () => {
    setCourseItems([
      {
        title: '',
        description: '',
        keywords: '',
        youtube_id: '',
      },
    ]);
  };

  // 코스 아이템 삭제
  const removeCourseItem = (index: number) => {
    setCourseItems(courseItems.filter((_, i) => i !== index));
  };

  // 코스 아이템 업데이트
  const updateCourseItem = (
    index: number,
    field: keyof CourseItemFormData,
    value: string
  ) => {
    const updatedItems = [...courseItems];

    // 키워드 필드인 경우 특별 처리
    if (field === 'keywords') {
      // 키워드는 문자열 그대로 저장 (서버에서 배열로 변환)
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }

    setCourseItems(updatedItems);
  };

  // YouTube URL에서 ID 추출
  const extractYoutubeId = (url: string, index: number) => {
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);

    if (match && match[1]) {
      updateCourseItem(index, 'youtube_id', match[1]);
    } else {
      // 유효한 YouTube URL이 아니면 입력값 그대로 사용
      updateCourseItem(index, 'youtube_id', url);
    }
  };

  // 커스텀 카테고리 추가
  const addCustomCategory = () => {
    if (newCategory.trim()) {
      setCategory(newCategory.trim());
      setShowCategoryInput(false);
    }
  };

  // 폼 제출 처리
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    // 폼 유효성 검사
    if (!category) {
      showToast('카테고리를 선택해주세요.', 'error');
      return;
    }

    if (courseItems.length === 0) {
      showToast('최소 하나의 강의를 추가해주세요.', 'error');
      return;
    }

    // 각 강의 아이템 유효성 검사
    for (let i = 0; i < courseItems.length; i++) {
      const item = courseItems[i];
      if (!item.title.trim()) {
        showToast(`강의 ${i + 1}의 제목을 입력해주세요.`, 'error');
        return;
      }
      if (!item.youtube_id.trim()) {
        showToast(
          `강의 ${i + 1}의 YouTube URL 또는 ID를 입력해주세요.`,
          'error'
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);

      for (let i = 0; i < courseItems.length; i++) {
        const item = courseItems[i];

        // 각 강의를 별도의 코스로 생성
        const courseData: CourseFormData = {
          title: item.title,
          description: item.description || `${category} 카테고리의 강의`,
          category: category as CourseCategory,
        };

        // 코스 생성
        const course = await createCourse(courseData);

        // 강의 아이템 생성 - 하나의 코스에 하나의 아이템만 추가
        await createCourseItem(
          course.id,
          {
            title: item.title,
            description: item.description || '',
            keywords: item.keywords || '',
            youtube_id: item.youtube_id,
          },
          1
        );
      }

      showToast(
        `${courseItems.length}개의 강의가 성공적으로 생성되었습니다.`,
        'success'
      );
      window.location.href = `/course/${category}`;
    } catch (error) {
      console.error('CourseCreatePageContent강의 생성 실패:', error);
      showToast('강의 생성에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-12 mobile:px-4 tablet:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">코스 개설</h1>
        <Link
          href="/course"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
          돌아가기
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 카테고리 선택 */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-xl font-semibold">카테고리 선택</h2>

          <div className="space-y-4">
            {!showCategoryInput ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(COURSE_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`rounded-lg px-3 py-2 text-sm transition ${
                      category === key
                        ? 'bg-gold-start text-white'
                        : 'border hover:bg-gray-50'
                    }`}
                  >
                    {cat.title}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setShowCategoryInput(true)}
                  className="flex items-center gap-1 rounded-lg border px-3 py-2 text-gray-700 hover:border-gold-start hover:bg-gold-start"
                >
                  <PlusCircle size={16} />
                  <span>추가</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="새 카테고리 이름"
                  className="flex-1 rounded-lg border px-3 py-2"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomCategory}
                  className="rounded-lg bg-gold-start px-3 py-2 text-white"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryInput(false)}
                  className="rounded-lg border px-3 py-2"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {category && !Object.keys(COURSE_CATEGORIES).includes(category) && (
              <div className="mt-2 rounded-lg bg-yellow-50 p-2 text-sm text-yellow-700">
                커스텀 카테고리: {category}
              </div>
            )}
          </div>
        </div>

        {/* 강의 목록 */}
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">강의 목록</h2>
            <Button
              type="button"
              onClick={addCourseItem}
              className="flex items-center gap-1 rounded-lg px-3 py-2"
            >
              <PlusCircle size={16} />
              <span>추가</span>
            </Button>
          </div>

          {courseItems.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              강의를 추가해주세요.
            </div>
          ) : (
            <div className="space-y-4">
              {courseItems.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">강의 {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeCourseItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* 강의 제목 */}
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        강의 제목 *
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateCourseItem(index, 'title', e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder="강의 제목을 입력하세요"
                        required
                      />
                    </div>

                    {/* 강의 설명 */}
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        강의 설명
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) =>
                          updateCourseItem(index, 'description', e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder="강의에 대한 설명을 입력하세요"
                        rows={3}
                      />
                    </div>

                    {/* YouTube URL */}
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        YouTube URL *
                      </label>
                      <div className="flex items-center gap-2">
                        <Youtube className="h-5 w-5 text-red-500" />
                        <input
                          type="text"
                          value={item.youtube_id}
                          onChange={(e) =>
                            extractYoutubeId(e.target.value, index)
                          }
                          className="flex-1 rounded-lg border px-3 py-2"
                          placeholder="YouTube URL 또는 Video ID"
                          required
                        />
                      </div>
                    </div>

                    {/* 키워드 */}
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        키워드
                      </label>
                      <input
                        type="text"
                        value={item.keywords}
                        onChange={(e) =>
                          updateCourseItem(index, 'keywords', e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder="키워드를 쉼표로 구분하여 입력하세요"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-3">
          <Link
            href="/course"
            className="rounded-lg border px-6 py-2 text-gray-600 hover:bg-gray-50"
          >
            취소
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || courseItems.length === 0}
            className="rounded-lg bg-gold-start px-6 py-2 text-white hover:bg-gold-start/90 disabled:opacity-50"
          >
            {isSubmitting ? '생성 중...' : '생성'}
          </Button>
        </div>
      </form>
    </div>
  );
}
