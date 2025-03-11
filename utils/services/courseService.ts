import { Course, CourseFormData, CourseItem, CourseItemFormData, CourseWriting, WritingFormData } from '@/types/course/courseModel';
import { createClient } from '../supabase/client';

// 코스 상세 정보 조회 (섹션 및 아이템 포함)
export async function fetchCourseDetail(courseId: string) {
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
}

// 사용자의 코스 진행 상황 조회
export async function getUserCourseProgress(courseId: string) {
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
}

// 마지막으로 접근한 아이템 조회
export async function getLastAccessedItem(courseId: string) {
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
}

// 아이템 완료 표시
export async function markItemAsCompleted(courseId: string, itemId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('로그인이 필요합니다.');
  
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
}

// 관리자 권한 확인
export async function isAdminUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  return profile?.role === 'admin';
}

// 코스 목록 조회
export async function fetchCourses() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Course[];
}

// 카테고리별 코스 조회
export async function fetchCoursesByCategory(category: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Course[];
}

// 코스 상세 조회
export async function fetchCourseById(courseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error) throw error;
  return data as Course;
}

// 코스 아이템 목록 조회
export async function fetchCourseItems(courseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('course_items')
    .select('*')
    .eq('course_id', courseId)
    .order('order_num', { ascending: true });

  if (error) throw error;
  return data as CourseItem[];
}

// 코스 아이템 상세 조회
export async function fetchCourseItemById(itemId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('course_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) throw error;
  return data as CourseItem;
}

// 코스 생성
export async function createCourse(formData: CourseFormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('로그인이 필요합니다.');
  
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
  return data as Course;
}

// 코스 아이템 생성
export async function createCourseItem(courseId: string, formData: CourseItemFormData, orderNum?: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('로그인이 필요합니다.');
  
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
  
  // 아이템 생성
  const { data, error } = await supabase
    .from('course_items')
    .insert({
      course_id: courseId,
      title: formData.title,
      description: formData.description,
      keywords: formData.keywords,
      youtube_id: formData.youtube_id,
      order_num: itemOrderNum
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as CourseItem;
}

// 사용자 글쓰기 저장/업데이트
export async function saveWriting(courseId: string, itemId: string, formData: WritingFormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('로그인이 필요합니다.');
  
  // 사용자 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, nickname')
    .eq('id', user.id)
    .single();
  
  if (!profile) throw new Error('프로필 정보를 찾을 수 없습니다.');
  
  const userName = profile.nickname || profile.name || '익명';
  
  // 이미 작성한 글이 있는지 확인
  const { data: existingWriting } = await supabase
    .from('course_writings')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('item_id', itemId)
    .maybeSingle();
  
  let result;
  
  if (existingWriting) {
    // 기존 글 업데이트
    const { data, error } = await supabase
      .from('course_writings')
      .update({
        content: formData.content,
        is_public: formData.is_public,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingWriting.id)
      .select()
      .single();
    
    if (error) throw error;
    result = data;
  } else {
    // 새 글 작성
    const { data, error } = await supabase
      .from('course_writings')
      .insert({
        user_id: user.id,
        user_name: userName,
        course_id: courseId,
        item_id: itemId,
        content: formData.content,
        is_public: formData.is_public
      })
      .select()
      .single();
    
    if (error) throw error;
    result = data;
  }
  
  return result as CourseWriting;
}

// 사용자 글쓰기 조회
export async function fetchUserWriting(courseId: string, itemId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('course_writings')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('item_id', itemId)
    .maybeSingle();
  
  if (error) throw error;
  return data as CourseWriting | null;
}

// 공개된 다른 사용자 글쓰기 조회
export async function fetchPublicWritings(courseId: string, itemId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // 공개된 다른 사용자 글 가져오기
  const query = supabase
    .from('course_writings')
    .select('*')
    .eq('course_id', courseId)
    .eq('item_id', itemId)
    .eq('is_public', true);
  
  // 로그인한 경우 자신의 글은 제외
  if (user) {
    query.neq('user_id', user.id);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data as CourseWriting[];
}

// 사용자가 작성한 모든 글 조회
export async function fetchAllUserWritings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('로그인이 필요합니다.');
  
  const { data, error } = await supabase
    .from('course_writings')
    .select(`
      *,
      course:courses(id, title, category),
      item:course_items(id, title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
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

// 강의 삭제 함수
export async function deleteCourseMutation(courseId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('로그인이 필요합니다.');

  // 관리자 권한 확인
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    throw new Error('관리자만 강의를 삭제할 수 있습니다.');
  }

  // 트랙잭션 처리 - 관련 데이터 모두 삭제

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
}

// 코스 업데이트 함수
export async function updateCourse(courseIs: string, formData: CourseFormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('로그인이 필요합니다.');

  // 관리자 권한 확인
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    throw new Error('관리자만 코스를 수정할 수 있습니다.');
  }

  // 코스 정보 업데이트
  const { data, error } = await supabase
    .from('courses')
    .update({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseIs)
    .select()
    .single();

  if (error) throw error;
  return data;
}