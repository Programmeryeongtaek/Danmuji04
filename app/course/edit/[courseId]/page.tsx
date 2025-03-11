'use client';

import CourseEditForm from '@/components/Course/CourseEditForm';
import { useCoursePermission } from '@/hooks/useCourse';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CourseEditPageProps {
  params: {
    courseId: string;
  };
}

export default function CourseEditPage({ params }: CourseEditPageProps) {
  const { courseId } = params;
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || '';
  const { isAdmin, isLoading } = useCoursePermission();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // 로딩이 끝난 후 권한 확인
    if (!isLoading) {
      setIsAuthorized(isAdmin);

      // 권한이 없는 경우 홈으로 리다이렉트
      if (!isAdmin) {
        alert('관리자만 접근할 수 있는 페이지입니다.');
        window.location.href = '/course';
      }
    }
  }, [isAdmin, isLoading]);

  // 로딩 중이거나 권한 확인 중인 경우
  if (isLoading || isAuthorized === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">권한을 확인하는 중...</div>
      </div>
    );
  }

  // 권한이 없는 경우 (리다이렉트 전에 표시될 수 있음)
  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-500">접근 권한이 없습니다</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">강의 수정</h1>
      <CourseEditForm courseId={courseId} category={category} />
    </div>
  );
}
