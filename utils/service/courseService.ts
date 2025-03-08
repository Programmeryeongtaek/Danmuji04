import { Course, CourseFormData, CourseProgress, CourseSectionFormData, CourseWithSections } from '@/types/course/courseModel';
import { createClient } from '../supabase/client';

// 코스 목록 조회
export async function fetchCourse() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Course[];
}

// 카테고리별 코스 조회
export async function fetchCourseByCategory(category: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Course[];
}

// 코스 상세 조회 (섹션 및 아이템 포함)
export async function fetchCourseDetail(courseId: string): Promise<CourseWithSections> {
  const supabase = createClient();

  // 코스 기본 정보 조회
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
  
  if (courseError) throw courseError;

  // 코스 섹션 조회
  const { data: sectionsData, error: sectionsError } = await supabase
    .from('courses_sections')
    .select('*')
    .eq('course_id', courseId)
    .order('order_num', { ascending: true });

  if (sectionsError) throw sectionsError;

  // 섹션별 아이템 조회
  const sectionsWithItems = await Promise.all(
    sectionsData.map(async (section) => {
      const { data: itemsData, error: itemsError } = await supabase
        .from('courses_items')
        .select('*')
        .eq('section_id', section.id)
        .order('order_num', { ascending: true });

      if (itemsError) throw itemsError;

      return {
        ...section,
        items: itemsData || [],
      };
    })
  );

  return {
    ...courseData,
    sections: sectionsWithItems,
  } as CourseWithSections;
}

// 코스 생성
export async function createCourse(formData: CourseFormData, sections: CourseSectionFormData[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('로그인이 필요합니다.');

  // 사용자의 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, nickname, role')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('사용자 프로필을 찾을 수 없습니다.');

  // 관리자만 코스 생성 가능
  if (profile.role !== 'admin') {
    throw new Error('관리자만 코스를 생성할 수 있습니다.');
  }
  
  // 1. 코스 생성
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      thumbnail_url: formData.thumbnail_url,
      instructor_id: user.id,
      instructor_name: profile.nickname || profile.name,
      is_premium: formData.is_premium
    })
    .select()
    .single();

  if (courseError) throw courseError;

  // 2. 각 섹션 및 아이템 생성
  for (const section of sections) {
    // 섹션 생성
    const { data: sectionData, error: sectionError } = await supabase
      .from('course_sections')
      .insert({
        course_id: course.id,
        title: section.title,
        description: section.description,
        order_num: section.order_num
      })
      .select()
      .single();
    
    if (sectionError) throw sectionError;
    
    // 섹션의 각 아이템 생성
    if (section.items && section.items.length > 0) {
      const itemsToInsert = section.items.map(item => ({
        section_id: sectionData.id,
        title: item.title,
        description: item.description,
        type: item.type,
        content_url: item.content_url || '',
        duration: item.duration || '',
        order_num: item.order_num
      }));
      
      const { error: itemsError } = await supabase
        .from('course_items')
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
    }
  }
  
  return course;
}

// 사용자가 관리자인지 확인
export async function isAdminUser() {
  const supabase = createClient();
  const { data: { user} } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile} = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

// 아이템 완료 표시
export async function markItemAsCompleted(courseId: string, itemId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('로그인이 필요합니다.');

  // 이미 완료된 항목인지 확인
  const { data: existingProgress } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existingProgress) {
    // 이미 존재하면 업데이트
    const { error } = await supabase
      .from('course_progress')
      .update({
        completed: true,
        last_accessed: new Date().toISOString()
      })
      .eq('id', existingProgress.id);

    if (error) throw error;
  } else {
    // 존재하지 않으면 새로 생성
    const { error } = await supabase
      .from('course_progress')
      .insert({
        user_id: user.id,
        course_id: courseId,
        item_id: itemId,
        completed: true,
        last_accessed: new Date().toISOString()
      });

    if (error) throw error;
  }

  return true;
}

// 사용자의 코스 진행 상황 조회
export async function getUserCourseProgress(courseId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', courseId)

  return data as CourseProgress[];
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