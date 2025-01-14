import { CourseDynamicContent } from '@/components/Course/[slug]/CourseDynamicContent';

interface CourseDynamicPageProps {
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

const CourseDynamicPage = async ({ params }: CourseDynamicPageProps) => {
  const { slug } = await params;
  const title = courseTitles[slug as keyof typeof courseTitles];

  return <CourseDynamicContent slug={slug} title={title} />;
};

export default CourseDynamicPage;
