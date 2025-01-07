import { BasicCourseProps } from '@/types/course/courseType';
import Link from 'next/link';

const BasicCourse = ({ children }: BasicCourseProps) => {
  const courses = [
    {
      id: 'reading',
      title: '독서',
      slug: 'reading',
      description: '독서에 대한 설명',
    },
    {
      id: 'writing',
      title: '글쓰기',
      slug: 'writing',
      description: '글쓰기에 대한 설명',
    },
    {
      id: 'question',
      title: '질문',
      slug: 'question',
      description: '질문에 대한 설명',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Basic Course</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/course/${course.slug}`}
            className="group rounded-lg border border-gray-200 p-6 transition-all hover:border-gold-start hover:shadow-lg"
          >
            <h2 className="mb-2 text-xl font-semibold text-dark group-hover:text-gold-start">
              {course.title}
            </h2>
            <p className="text-gray-600">{course.description}</p>
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
};

export default BasicCourse;
