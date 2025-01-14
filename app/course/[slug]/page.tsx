import CourseContent from '@/components/Course/[slug]/CourseContent';
import QuoteSection from '@/components/Course/QuotesSection';
import { useParams } from 'next/navigation';

const courseTitles = {
  reading: '독서',
  writing: '글쓰기',
  question: '질문',
} as const;

export function generateStaticParams() {
  return Object.keys(courseTitles).map((slug) => ({
    slug,
  }));
}

const CoursePage = () => {
  const params = useParams();
  const slug = params.slug as 'reading' | 'writing' | 'question';
  const title = courseTitles[slug];

  return (
    <div>
      <QuoteSection category={slug} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div>
          <CourseContent category={slug} />
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
