import { Course, CourseFormData, CourseItem } from '@/app/types/course/courseTypes';
import { isAdminUser, requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 코스 상세 정보 조회 (섹션 및 아이템 포함)
export async function fetchCourseDetail(courseId: string) {
  try {
    const supabase = createClient();
    
    // 1. 코스 기본 정보 조회
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
    
    if (courseError) throw courseError;
    
    // 2. 코스 아이템 조회
    const { data: items, error: itemsError } = await supabase
      .from('course_items')
      .select('*')
      .eq('course_id', courseId)
      .order('order_num', { ascending: true });
    
    if (itemsError) throw itemsError;
    
    // 3. 결과 조합
    return {
      ...course,
      sections: [
        {
          id: 'main-section',
          title: '강의 목록',
          items: items || []
        }
      ]
    };
  } catch (error) {
    console.error('코스 상세 정보 조회 실패:', error);
    throw error;
  }
}

// 사용자의 코스 진행 상황 조회
export async function getUserCourseProgress(courseId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('course_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('진행 상황 조회 실패:', error);
    return [];
  }
}

// 마지막으로 접근한 아이템 조회
export async function getLastAccessedItem(courseId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    const { data } = await supabase
      .from('course_progress')
      .select('item_id, last_accessed')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('last_accessed', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return data?.item_id || null;
  } catch (error) {
    console.error('마지막 접근 아이템 조회 실패:', error);
    return null;
  }
}

// 완료 처리
export async function markItemAsCompleted(courseId: string, itemId: string) {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 이미 진행 상태가 있는지 확인
    const { data: existingProgress } = await supabase
      .from('course_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('item_id', itemId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existingProgress) {
      // 기존 진행 상태 업데이트
      const { error } = await supabase
        .from('course_progress')
        .update({
          completed: true,
          last_accessed: now
        })
        .eq('id', existingProgress.id);

      if (error) throw error;
    } else {
      // 새 진행 상태 생성
      const { error } = await supabase
        .from('course_progress')
        .insert({
          user_id: user.id,
          course_id: courseId,
          item_id: itemId,
          completed: true,
          last_accessed: now
        });

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('아이템 완료 표시 실패:', error);
    return false;
  }
}

// 코스 목록 조회
export async function fetchCourses(): Promise<Course[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Course[];
  } catch (error) {
    console.error('코스 목록 조회 실패:', error);
    return [];
  }
}

// 카테고리별 코스 조회
export async function fetchCoursesByCategory(category: string): Promise<Course[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Course[];
  } catch (error) {
    console.error('카테고리별 코스 조회 실패:', error);
    return [];
  }
}

// 코스 상세 정보 조회
export async function fetchCourseById(courseId: string): Promise<Course> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) throw error;
    return data as Course;
  } catch (error) {
    console.error('코스 상세 정보 조회 실패:', error);
    throw error;
  }
}

// 코스 아이템 목록 조회
export async function fetchCourseItems(courseId: string): Promise<CourseItem[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('course_items')
      .select('*')
      .eq('course_id', courseId)
      .order('order_num', { ascending: true });

    if (error) throw error;
    return data as CourseItem[];
  } catch (error) {
    console.error('코스 아이템 조회 실패:', error);
    return [];
  }
}

// 코스 아이템 상세 정보 조회
export async function fetchCourseItemById(itemId: string): Promise<CourseItem> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('course_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data as CourseItem;
  } catch (error) {
    console.error('코스 아이템 상세 조회 실패:', error);
    throw error;
  }
}

// 코스 생성
export async function createCourse(formData: CourseFormData): Promise<Course> {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
    // 관리자 권한 확인
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error('관리자만 코스를 생성할 수 있습니다.');
    }
    
    // 사용자 프로필 정보 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, nickname')
      .eq('id', user.id)
      .single();
    
    if (!profile) throw new Error('프로필 정보를 찾을 수 없습니다.');
    
    // 코스 생성
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        instructor_id: user.id,
        instructor_name: profile.nickname || profile.name
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 코스 생성 성공 후
    if (data) {
      // 수료증이 있는 사용자들에게 알림 생성
      try {
        // 해당 카테고리의 수료증을 가진 사용자 조회
        const { data: certificateUsers } = await supabase
          .from('certificates')
          .select('user_id')
          .eq('category', formData.category)
          .eq('is_outdated', false); // 유효한 수료증을 가진 사용자만

        if (certificateUsers && certificateUsers.length > 0) {
          // 각 사용자에게 알림 생성
          const notifications = certificateUsers.map(cert => ({
            user_id: cert.user_id,
            title: '새 강의 추가됨',
            message: `${formData.title} 강의가 ${formData.category} 카테고리에 추가되었습니다.`,
            type: 'course_added',
            related_data: {
              category: formData.category,
              course_id: data.id,
              course_title: formData.title
            },
            read: false
          }));

          // 알림 일괄 생성
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notificationError) console.error('알림 생성 실패:', notificationError);

          // 수료증 상태 업데이트 (is_outdated = true)
          const { error: certUpdateError } = await supabase
            .from('certificates')
            .update({ is_outdated: true})
            .eq('category', formData.category)
            .eq('is_outdated', false);

          if (certUpdateError) console.error('수료증 상태 업데이트 실패:', certUpdateError);
        }
      } catch (error) {
        console.error('알림 처리 중 오류:', error);
        // 주요 기능은 성공했으므로 알림 오류는 throw하지 않음
      }
    }

    return data as Course;
  } catch (error) {
    console.error('코스 생성 실패:', error);
    throw error;
  }
}

// 코스 수정
export async function updateCourse(
  courseId: string,
  formData: CourseFormData
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // 관리자 권한 확인
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error('관리자만 코스를 수정할 수 있습니다.');
    }
    
    // 코스 수정
    const { error } = await supabase
      .from('courses')
      .update({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('코스 수정 실패:', error);
    throw error;
  }
}

// 코스 삭제
export async function deleteCourse(courseId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // 관리자 권한 확인
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error('관리자만 코스를 삭제할 수 있습니다.');
    }
    
    // 관련 데이터 삭제
    // 1. 코스 아이템 삭제
    const { error: itemsError } = await supabase
      .from('course_items')
      .delete()
      .eq('course_id', courseId);
    
    if (itemsError) throw itemsError;
    
    // 2. 수강 진행 상황 삭제
    const { error: progressError } = await supabase
      .from('course_progress')
      .delete()
      .eq('course_id', courseId);
    
    if (progressError) throw progressError;
    
    // 3. 글쓰기 기록 삭제
    const { error: writingsError } = await supabase
      .from('course_writings')
      .delete()
      .eq('course_id', courseId);
    
    if (writingsError) throw writingsError;
    
    // 4. 코스 자체 삭제
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