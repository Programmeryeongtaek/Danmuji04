import { CourseItem, CourseItemFormData } from '@/app/types/course/courseTypes';
import { isAdminUser, requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 코스 아이템 생성
export async function createCourseItem(
  courseId: string, 
  formData: CourseItemFormData, 
  orderNum?: number
): Promise<CourseItem> {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
    // 코스 소유자 또는 관리자 확인
    const { data: course } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single();
    
    if (!course) throw new Error('코스를 찾을 수 없습니다.');
    
    const isAdmin = await isAdminUser();
    if (course.instructor_id !== user.id && !isAdmin) {
      throw new Error('코스 작성자만 아이템을 추가할 수 있습니다.');
    }
    
    // 순서 번호 결정 (지정되지 않은 경우 마지막에 추가)
    let itemOrderNum = orderNum;
    if (!itemOrderNum) {
      const { data: items } = await supabase
        .from('course_items')
        .select('order_num')
        .eq('course_id', courseId)
        .order('order_num', { ascending: false })
        .limit(1);
      
      itemOrderNum = items && items.length > 0 ? items[0].order_num + 1 : 1;
    }
    
    // 키워드 처리
    const keywords = typeof formData.keywords === 'string' 
      ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) 
      : formData.keywords || [];
    
    // 아이템 생성
    const { data, error } = await supabase
      .from('course_items')
      .insert({
        course_id: courseId,
        title: formData.title,
        description: formData.description,
        keywords: keywords,
        youtube_id: formData.youtube_id,
        order_num: itemOrderNum
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as CourseItem;
  } catch (error) {
    console.error('코스 아이템 생성 실패:', error);
    throw error;
  }
}

// YouTube URL에서 ID 추출
export function extractYoutubeId(url: string): string {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // URL이 아니면 ID로 간주
  return url;
}