import LectureContent from '@/components/knowledge/lecture/LectureContent';
import { createClient } from '@/utils/supabase/server';
import { Suspense } from 'react';

type Params = Promise<{ id: string }>;

export default async function LecturePage(props: { params: Params }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: lecture, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) throw error;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LectureContent lecture={lecture} />
    </Suspense>
  );
}
