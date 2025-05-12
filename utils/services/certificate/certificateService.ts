import { Certificate } from '@/app/types/certificate/certificateTypes';
import { requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';


// 특정 카테고리의 수료증 조회
export async function getCertificate(category: string): Promise<Certificate | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .maybeSingle();

    if (error) {
      console.error('Error fetching certificate:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('수료증 조회 실패:', error);
    return null;
  }
}

// 사용자의 모든 수료증 조회
export async function getAllCertificates(): Promise<Certificate[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (error) { 
      console.error('Error fetching certificates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('모든 수료증 조회 실패:', error);
    return [];
  }
}

// 수료증 발급
export async function generateCertificate(category: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
    // 해당 카테고리의 모든 강의 ID 가져오기
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('category', category);
    
    if (!courses || courses.length === 0) {
      console.error('카테고리에 해당하는 강의가 없습니다:', category);
      return false;
    }
    
    const courseIds = courses.map(course => course.id);
    
    // 완료된 강의 확인
    const { data: progress } = await supabase
      .from('course_progress')
      .select('course_id')
      .eq('user_id', user.id)
      .eq('completed', true)
      .in('course_id', courseIds);
    
    const completedCourseIds = progress?.map(p => p.course_id) || [];
    
    // 모든 강의를 완료했는지 확인
    const allCompleted = courseIds.every(id => completedCourseIds.includes(id));
    
    if (!allCompleted) {
      console.error('모든 강의를 완료하지 않았습니다.');
      return false;
    }
    
    // 이미 발급된 수료증이 있는지 확인
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', user.id)
      .eq('category', category)
      .maybeSingle();
    
    if (existingCert) {
      // 수료증 업데이트
      const { error: updateError } = await supabase
        .from('certificates')
        .update({
          is_outdated: false,
          updated_at: new Date().toISOString(),
          completed_courses: courseIds
        })
        .eq('id', existingCert.id);
      
      if (updateError) throw updateError;
    } else {
      // 새 수료증 발급
      const { error: insertError } = await supabase
        .from('certificates')
        .insert({
          user_id: user.id,
          category: category,
          is_outdated: false,
          completed_courses: courseIds
        });
      
      if (insertError) throw insertError;
      
      // 알림 생성
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: '수료증 발급',
          message: `${category} 카테고리의 수료증이 발급되었습니다.`,
          type: 'certificate_issued',
          related_data: { category: category },
          read: false
        });
      
      if (notificationError) {
        console.error('알림 생성 오류:', notificationError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('수료증 발급 중 오류:', error);
    return false;
  }
}

// 수료증 갱신
export async function updateCertificate(certificateId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 수료증 정보 가져오기
    const { data: certificate } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (!certificate) return false;

    // 해당 카테고리의 모든 강의 ID 가져오기
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('category', certificate.category);

    if (!courses) return false;

    const courseIds = courses.map(course => course.id);

    // 모든 강의의 완료 상태 확인
    const { data: progress } = await supabase
      .from('course_progress')
      .select('course_id')
      .eq('user_id', user.id)
      .eq('completed', true)
      .in('course_id', courseIds);

    const completedCourseIds = progress?.map(p => p.course_id) || [];

    // 모든 강의를 완료했는지 확인
    const allCompleted = courseIds.every(id => completedCourseIds.includes(id));

    if (allCompleted) {
      // 수료증 업데이트
      const { error } = await supabase
        .from('certificates')
        .update({
          is_outdated: false, // 명시적으로 설정
          updated_at: new Date().toISOString(),
          completed_courses: courseIds
        })
        .eq('id', certificateId);

      if (error) {
        console.error('Error updating certificate:', error);
        return false;
      }

      return true;
    }

    return false; // 모든 강의를 완료하지 않았으면 갱신 불가
  } catch (error) {
    console.error('수료증 갱신 실패:', error);
    return false;
  }
}