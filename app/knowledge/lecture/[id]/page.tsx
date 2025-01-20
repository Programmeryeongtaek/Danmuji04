import { createClient } from '@/utils/supabase/client';

async function getLectureById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

const LecturePage = async ({ params }: { params: { id: string } }) => {
  const lecture = await getLectureById(params.id);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 강의 상세 내용 */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* 왼쪽: 강의 정보 */}
        <div className="md:col-span-2">
          <h1 className="mb-4 text-2xl font-bold">{lecture.title}</h1>
          <div className="mb-4">
            <span className="mr-2 rounded-full bg-gold-start px-3 py-1 text-sm text-white">
              {lecture.category}
            </span>
            <span className="rounded-full bg-gray-200 px-3 py-1 text-sm">
              {lecture.depth}
            </span>
          </div>
          <p className="mb-4 text-gray-600">강사: {lecture.instructor}</p>
          {/* 추가 강의 정보 */}
        </div>

        {/* 오른쪽: 수강신청 섹션 */}
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <div className="mb-4">
            <h2 className="mb-2 text-xl font-bold">수강 정보</h2>
            <p className="text-gray-600">수강생: {lecture.students}명</p>
          </div>
          <button className="w-full rounded-lg bg-gold-start px-4 py-2 text-white transition-colors hover:bg-gold-end">
            수강신청하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default LecturePage;
