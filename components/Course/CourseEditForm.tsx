'use client';

import {
  CATEGORY_IDS,
  COURSE_CATEGORIES,
  CourseCategory,
} from '@/app/types/course/categories';
import { FormEvent, useEffect, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import {
  fetchCourseById,
  updateCourse,
} from '@/utils/services/course/courseService';
import { CourseFormData } from '@/app/types/course/courseModel';
import Button from '../common/Button/Button';
import { ChevronDown } from 'lucide-react';

interface CourseEditFormProps {
  courseId: string;
  category: string;
}

export default function CourseEditForm({
  courseId,
  category,
}: CourseEditFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    category: (category || 'reading') as CourseCategory,
  });
  const { showToast } = useToast();

  // 기존 강의 데이터 가져오기
  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setIsLoading(true);
        const courseData = await fetchCourseById(courseId);

        // 폼 데이터 초기화
        setFormData({
          title: courseData.title,
          description: courseData.description || '',
          category: courseData.category as CourseCategory,
        });
      } catch (error) {
        console.error('강의 데이터 로드 실패:', error);
        showToast('강의 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, showToast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast('강의 제목을 입력해주세요.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateCourse(courseId, formData);
      showToast('강의 정보가 수정되었습니다.', 'success');

      // 성공 후 해당 카테고리 목록 페이지로 이동
      window.location.href = `/course/${formData.category}`;
    } catch (error) {
      console.error('강의 수정 실패:', error);
      showToast('강의 수정에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center">강의 정보를 불러오는 중...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="mb-1 block font-medium">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full rounded-lg border border-gray-300 p-2 hover:bg-light focus:border-gold-start focus:bg-light focus:outline-none focus:ring-1 focus:ring-gold-start"
          required
        />
      </div>

      <div>
        <label htmlFor="category" className="mb-1 block font-medium">
          카테고리 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            id="category"
            value={formData.category}
            onChange={(e) =>
              setFormData({
                ...formData,
                category: e.target.value as CourseCategory,
              })
            }
            className="w-full appearance-none rounded-lg border border-gray-300 p-2 pr-10 hover:bg-light focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
          >
            {CATEGORY_IDS.map((catId) => (
              <option key={catId} value={catId}>
                {COURSE_CATEGORIES[catId].title}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block font-medium">
          설명
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={10}
          className="w-full rounded-lg border border-gray-300 p-2 hover:bg-light focus:border-gold-start focus:bg-light focus:outline-none focus:ring-1 focus:ring-gold-start"
        />
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          disabled={isSubmitting}
        >
          취소
        </button>
        <Button
          type="submit"
          className="px-4 py-2 text-white disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? '수정 중...' : '수정'}
        </Button>
      </div>
    </form>
  );
}
