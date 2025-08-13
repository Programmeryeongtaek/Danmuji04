'use client';

import { useSearchParams } from 'next/navigation';
import CourseEditForm from './CourseEditForm';
import { useCoursePermission } from '@/hooks/useCourse';
import { useEffect, useState } from 'react';
import { useToast } from '../common/Toast/Context';

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
  const { showToast } = useToast(); // 🔥 추가

  useEffect(() => {
    console.log('🔍 CourseEditClient 권한 체크:', {
      checkPermission,
      isLoading,
      isAdmin,
    });

    if (checkPermission && !isLoading) {
      setIsAuthorized(isAdmin);

      if (!isAdmin) {
        console.log('❌ CourseEditClient에서 관리자 권한 없음');
        // 🔥 alert 대신 toast 사용
        showToast('관리자만 접근할 수 있습니다.', 'error');
        setTimeout(() => {
          window.location.href = '/course';
        }, 1000);
      } else {
        console.log('✅ CourseEditClient에서 관리자 권한 확인됨');
      }
    }
  }, [isAdmin, isLoading, checkPermission, showToast]);

  if (checkPermission && (isLoading || !isAuthorized)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
          <p className="text-gray-600">권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  console.log('✅ CourseEditClient 폼 렌더링');
  return <CourseEditForm courseId={courseId} category={category} />;
}
