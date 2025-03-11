'use client';

import { useToast } from '@/components/common/Toast/Context';
import { useCoursePermission } from '@/hooks/useCourse';
import { deleteCourseMutation } from '@/utils/services/courseService';
import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface CourseActionProps {
  courseId: string;
  category: string;
  onSuccess?: (courseId: string) => void;
}

export default function CourseActions({
  courseId,
  category,
  onSuccess,
}: CourseActionProps) {
  const { isAdmin, isLoading } = useCoursePermission();
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  // 관리자가 아니거나 권한 확인 중이면 아무것도 렌더링하지 않음
  if (!isAdmin || isLoading) return null;

  const handleEdit = () => {
    window.location.href = `/course/edit/${courseId}?category=${category}`;
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        '정말 이 강의를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteCourseMutation(courseId);
      showToast('강의가 삭제되었습니다.', 'success');

      // 롤백이 제공된 경우 호출
      if (onSuccess) {
        onSuccess(courseId);
      } else {
        // 그렇지 않으면 카테고리 페이지로 이동
        window.location.href = `/course/${category}`;
      }
    } catch (error) {
      console.error('강의 삭제 실패:', error);
      showToast('강의를 삭제하는 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleEdit}
        className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
        title="수정하기"
      >
        <Edit size={18} />
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-full p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
        title="삭제하기"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
