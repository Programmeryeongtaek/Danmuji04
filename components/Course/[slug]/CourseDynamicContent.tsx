import QuoteSection from '../QuotesSection';
import CourseContent from './CourseContent';

interface CourseDynamicContentProps {
  slug: 'reading' | 'writing' | 'question';
  title: string;
}

export const CourseDynamicContent = ({
  slug,
  title,
}: CourseDynamicContentProps) => {
  return (
    <div>
      <QuoteSection category={slug} />
      <div>
        <h1>{title}</h1>
        <div>
          <CourseContent category={slug} />
        </div>
      </div>
    </div>
  );
};
