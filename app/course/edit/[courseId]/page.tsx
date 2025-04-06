import CourseEditClient from '@/components/Course/CourseEditClient';

interface CourseEditPageProps {
  params: {
    courseId: string;
  };
}

export default async function CourseEditPage({ params }: CourseEditPageProps) {
  const { courseId } = await params;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">강의 수정</h1>
      <CourseEditClient courseId={courseId} checkPermission={true} />
    </div>
  );
}
