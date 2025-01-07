import CourseContent from '@/components/Course/[slug]/CourseContent';
import QuoteSection from '@/components/Course/QuotesSection';

interface CoursePageProps {
  params: {
    slug: 'reading' | 'writing' | 'question';
  };
}

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

const CoursePage = ({ params }: CoursePageProps) => {
  const title = courseTitles[params.slug];

  return (
    <div>
      <QuoteSection category={params.slug} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div>
          <CourseContent category={params.slug} />
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
