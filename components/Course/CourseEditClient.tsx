'use client';

import { useSearchParams } from 'next/navigation';
import CourseEditForm from './CourseEditForm';
import { useCoursePermission } from '@/hooks/useCourse';
import { useEffect, useState } from 'react';

interface CourseEditClientProps {
  courseId: string;
  checkPermission?: boolean;
}

export default function CourseEditClient({
  courseId,
  checkPermission = false,
}: CourseEditClientProps) {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || '';
  const { isAdmin, isLoading } = useCoursePermission();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (checkPermission && !isLoading) {
      setIsAuthorized(isAdmin);

      if (!isAdmin) {
        alert('관리자만 접근할 수 있습니다.');
        window.location.href = '/course';
      }
    }
  }, [isAdmin, isLoading, checkPermission]);

  if (checkPermission && (isLoading || !isAuthorized)) {
    return <div>권한을 확인하는 중...</div>;
  }

  return <CourseEditForm courseId={courseId} category={category} />;
}
