import { CategoryDynamicContent } from '@/components/Course/category/CategoryDynamicContent';
import {
  CATEGORY_IDS,
  COURSE_CATEGORIES,
  isValidCategory,
} from '@/app/types/course/categories';

type Params = Promise<{ slug: string }>;

// 정적 경로 생성
export function generateStaticParams() {
  return CATEGORY_IDS.map((category) => ({
    slug: category, // category 대신 slug로 변경
  }));
}

export default async function CategoryPage(props: { params: Params }) {
  const { slug } = await props.params; // category 대신 slug로 변경

  // 유효하지 않은 카테고리면 기본 카테고리로 폴백
  const validCategory = isValidCategory(slug) ? slug : 'reading';
  const title = COURSE_CATEGORIES[validCategory].title;

  return <CategoryDynamicContent category={validCategory} title={title} />;
}
