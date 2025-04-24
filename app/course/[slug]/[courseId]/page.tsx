import CourseLearnContent from '@/components/Course/learn/CourseLearnContent';
import { createClient } from '@/utils/supabase/client';
import { Suspense } from 'react';

type Params = Promise<{ slug: string; courseId: string }>;
type SearchParams = Promise<{ itemId?: string }>;

export default async function CoursePage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug, courseId } = await props.params;
  const { itemId: queryItemId } = await props.searchParams;

  // itemId가 URL 파라미터로 제공되면 사용하고, 그렇지 않으면 첫 번째 아이템을 찾습니다
  let itemId = queryItemId;

  if (!itemId) {
    // 첫 번째 강의 아이템 ID 가져오기
    const supabase = await createClient();
    const { data } = await supabase
      .from('course_items')
      .select('id')
      .eq('course_id', courseId)
      .order('order_num', { ascending: true })
      .limit(1)
      .single();

    itemId = data?.id;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="animate-pulse text-lg">로딩 중...</div>
        </div>
      }
    >
      {itemId ? (
        <CourseLearnContent
          courseId={courseId}
          itemId={itemId}
          category={slug}
        />
      ) : (
        <div className="flex h-screen flex-col items-center justify-center p-4">
          <h1 className="mb-4 text-xl font-bold">강의 컨텐츠가 없습니다</h1>
          <p className="text-center text-gray-600">
            이 강의에는 아직 컨텐츠가 등록되지 않았습니다.
          </p>
        </div>
      )}
    </Suspense>
  );
}
