import { isAdminUser } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 강의 삭제 (관리자)
export async function deleteCourseMutation(courseId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    // 관리자 권한 확인
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error('관리자만 강의를 삭제할 수 있습니다.');
    }

    // 트랜잭션 처리 - 관련 데이터 모두 삭제

    // 1. 코스 아이템 삭제
    const { error: itemsError} = await supabase
      .from('course_items')
      .delete()
      .eq('course_id', courseId);

    if (itemsError) throw itemsError;

    // 2. 관련 작성글 삭제
    const { error: writingError } = await supabase
      .from('course_writings')
      .delete()
      .eq('course_id', courseId);

    if (writingError) throw writingError;

    // 3. 수강 진행 상황 삭제
    const { error: progressError } = await supabase
      .from('course_progress')
      .delete()
      .eq('course_id', courseId);

    if (progressError) throw progressError;

    // 4. 마지막으로 코스 자체 삭제
    const { error: courseError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (courseError) throw courseError;

    return true;
  } catch (error) {
    console.error('코스 삭제 실패:', error);
    throw error;
  }
}