import { createClient } from '../supabase/client';

export interface Certificate {
  id: number;
  user_id: string;
  category: string;
  issued_at: string;
  updated_at: string | null;
  is_outdated: boolean;
  completed_courses: string[];
}

// 알림 관련 데이터 타입 정의
interface CourseAddedData {
  category: string;
  course_id: string;
  course_title: string;
}

interface CertificateData {
  category: string;
}

// 알림 타입에 따른 데이터 타입 정의
type NotificationRelatedData = CourseAddedData | CertificateData;

// 알림 인터페이스 업데이트
export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'course_added' | 'certificate_issued' | 'certificate_updated';
  related_data: NotificationRelatedData;
  read: boolean;
  created_at: string;
}

// 특정 카테고리의 수료증 조회
export async function getCertificate(category: string): Promise<Certificate | null> {
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
}

// 사용자의 모든 수료증 조회
export async function getAllCertificates(): Promise<Certificate[]> {
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
}

// 수료증 발급 함수
export async function generateCertificate(category: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    console.log(`수료증 발급 시도 - 카테고리: ${category}`);
    
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

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
        is_outdated: false,
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

  return false;
}

// 읽지 않은 알림 개수 조회
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error fetching notification count:', error);
    return 0;
  }

  return count || 0;
}

// 알림 목록 조회
export async function getNotifications(limit: number = 10, offset: number = 0): Promise<Notification[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

// 알림 읽음 처리
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }

  return true;
}

// 모든 알림 읽음 처리
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }

  return true;
}