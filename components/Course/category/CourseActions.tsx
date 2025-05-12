'use client';

import { useToast } from '@/components/common/Toast/Context';
import { deleteCourseMutation } from '@/utils/services/course/courseAdminService';
import { Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface CourseActionsProps {
  courseId: string;
  category: string;
  onSuccess?: (courseId: string) => void;
}

export default function CourseActions({
  courseId,
  category,
  onSuccess,
}: CourseActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDeleting) return;

    if (!confirm('이 강의를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteCourseMutation(courseId);

      showToast('강의가 삭제되었습니다.', 'success');

      // 삭제 성공 시 콜백 호출
      if (onSuccess) {
        onSuccess(courseId);
      }
    } catch (error) {
      console.error('강의 삭제 실패:', error);
      showToast('강의 삭제에 실패했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Link
        href={`/course/edit/${courseId}?category=${category}`}
        className="rounded p-1 text-blue-500 hover:bg-blue-50"
        onClick={(e) => e.stopPropagation()}
      >
        <Edit className="h-4 w-4" />
      </Link>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );
}
