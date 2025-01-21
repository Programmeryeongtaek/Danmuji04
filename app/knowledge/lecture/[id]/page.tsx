import EnrollBar from '@/components/knowledge/lecture/EnrollBar';
import LikeButton from '@/components/knowledge/lecture/LikeButton';
import ReviewSection from '@/components/knowledge/lecture/ReviewSection';
import ShareButton from '@/components/knowledge/lecture/ShareButton';
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
    <>
      <div className="min-h-screen bg-light">
        {/* 강의 정보 섹션 */}
        <div className="h-[525px] w-full border border-black px-4 py-8">
          <div className="flex h-full flex-col items-center gap-6 border border-black">
            <div className="flex h-[250px] w-[350px] border border-black">
              동영상 영역
            </div>
            <div className="flex w-full flex-col gap-4 border border-black">
              <div className="flex flex-col gap-1">
                <span>
                  {lecture.category} / {lecture.depth}
                </span>
                <h1>{lecture.title}</h1>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-1">
                  <span>{lecture.likes}</span>
                  <span>수강평 00개</span>
                  <span>수강생 {lecture.students}명</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span>{lecture.instructor}</span>
                  <span>{lecture.keyword}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <LikeButton
              lectureId={lecture.id}
              initialLikeCount={lecture.like}
              initialIsLiked={false}
            />
            <ShareButton lectureId={lecture.id} />
          </div>
        </div>

        {/* 강의 소개 */}
        {/*TODO: 강의 생성자가 작성한 것이 반영되도록 구현 */}
        <div>강의 소개 영역</div>

        {/* 수강평 */}
        <ReviewSection lectureId={lecture.id} />
      </div>
      <EnrollBar />
    </>
  );
};

export default LecturePage;
