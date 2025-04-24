import CourseEditClient from '@/components/Course/CourseEditClient';

type Params = Promise<{ courseId: string }>;

export default async function CourseEditPage(props: { params: Params }) {
  const { courseId } = await props.params;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">강의 수정</h1>
      <CourseEditClient courseId={courseId} checkPermission={true} />
    </div>
  );
}
