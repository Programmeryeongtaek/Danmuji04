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
export async function getUserCourseProgress(courseId: string): Promise<Array<{
  id: string;
  user_id: string;
  course_id: string;
  item_id: string;
  completed: boolean;
  last_accessed: string;
}>> {
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

// 코스 아이템 완료 여부 업데이트
export async function markCourseItemCompleted(
  courseId: string, 
  itemId: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('로그인 필요');
      return false;
    }

    // 디버깅용 로그: 입력 데이터 상세 정보
    console.log('Input Data:', {
      userId: user.id,
      courseId: courseId,
      itemId: itemId,
      userIdType: typeof user.id,
      courseIdType: typeof courseId,
      itemIdType: typeof itemId
    });

    const now = new Date().toISOString();
    
    // 명시적 데이터 객체 생성
    const progressData = {
      user_id: user.id,
      course_id: courseId,
      item_id: itemId,
      completed: true,
      last_accessed: now
    };

    // 상세 로깅
    console.log('Progress Data:', progressData);

    try {
      // 간단한 insert 시도
      const { error: insertError } = await supabase
        .from('course_progress')
        .insert(progressData);
      
      // 이미 존재하는 경우 (unique 제약조건 위반)
      if (insertError && insertError.code === '23505') {
        console.log('이미 존재하는 레코드, 업데이트 시도');
        
        // 업데이트 쿼리
        const { error: updateError } = await supabase
          .from('course_progress')
          .update({
            completed: true,
            last_accessed: now
          })
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('item_id', itemId);
        
        if (updateError) {
          console.error('업데이트 오류:', updateError);
          return false;
        }
      } else if (insertError) {
        console.error('삽입 오류:', insertError);
        return false;
      }
      
      return true;
    } catch (dbError) {
      console.error('데이터베이스 작업 중 오류:', dbError);
      return false;
    }
  } catch (error) {
    console.error('완료 처리 중 예외:', error);
    return false;
  }
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
    // 만약 소프트 삭제를 사용한다면:
    // .eq('is_deleted', false) 
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
      keywords: typeof formData.keywords === 'string' 
        ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) 
        : formData.keywords || [],
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
export async function updateCourse(courseId: string, formData: CourseFormData) {
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
    .eq('id', courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 사용자의 코스별 글쓰기 완료 여부 확인
export async function getUserWritingStatus(courseId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: {user} } = await supabase.auth.getUser();

  if (!user) return false;

  // 해당 코스에 사용자가 작성한 글이 있는지 확인
  const { data, error } = await supabase
    .from('course_writings')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) {
    console.error('글쓰기 상태 확인 실패:', error);
    return false;
  }

  return !!data; // 데이터가 있으면 true, 없으면 false
}

// 모든 코스의 진행 상황을 한번에 가져오는 함수
export async function fetchUserCoursesProgress(): Promise<Record<string, {
  completed: boolean,
  writingCompleted: boolean
}>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return {};

  try {
    // 1. 모든 코스 목록 먼저 가져오기
    const { data: courses } = await supabase
      .from('courses')
      .select('id');

    const result: Record<string, { completed: boolean, writingCompleted: boolean }> = {};

    // 기본 상태 초기화
    if (courses) {
      courses.forEach(course => {
        result[course.id] = { completed: false, writingCompleted: false };
      });
    }

    // 2. 사용자의 코스 진행 상황 가져오기
    const { data: progressItems } = await supabase
      .from('course_progress')
      .select('course_id, item_id, completed')
      .eq('user_id', user.id);

    // 코스별로 그룹화
    if (progressItems && progressItems.length > 0) {
      const courseProgress = progressItems.reduce<Record<string, Array<{course_id: string, item_id: string, completed: boolean}>>>((acc, item) => {
        if (!acc[item.course_id]) {
          acc[item.course_id] = [];
        }
        acc[item.course_id].push(item);
        return acc;
      }, {});

      // 각 코스의 완료 상태 설정
      Object.entries(courseProgress).forEach(([courseId, items]) => {
        // 하나라도 완료된 항목이 있으면 완료된 것으로 간주
        const isCompleted = items.some(item => item.completed);
        if (result[courseId]) {
          result[courseId].completed = isCompleted;
        } else {
          result[courseId] = { completed: isCompleted, writingCompleted: false };
        }
      });
    }

    // 3. 사용자의 글쓰기 상태 가져오기
    const { data: writings } = await supabase
      .from('course_writings')
      .select('course_id')
      .eq('user_id', user.id);

    if (writings && writings.length > 0) {
      writings.forEach(writing => {
        if (result[writing.course_id]) {
          result[writing.course_id].writingCompleted = true;
        } else {
          result[writing.course_id] = { completed: false, writingCompleted: true };
        }
      });
    }  

    return result;
  } catch (error) {
    console.error('코스 진행 상황 조회 실패:', error);
    return {};
  }
}

// 코스의 모든 아이템을 완료 처리하는 함수
export async function markCourseCompleted(courseId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  try {
    // 1. 코스의 모든 아이템 정보 가져오기
    const { data: items } = await supabase
      .from('course_items')
      .select('id')
      .eq('course_id', courseId);

    if (!items || items.length === 0) return false;

    // 2. 각 아이템에 대한 진행 정보 생성 또는 업데이트
    const now = new Date().toISOString();

    // 이미 존재하는 진행 정보 확인
    const { data: existingProgress } = await supabase
      .from('course_progress')
      .select('id, item_id')
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    const existingItems = new Set((existingProgress || []).map(p => p.item_id));

    // 새로 추가할 아이템과 업데이트할 아이템 분리
    const itemsToAdd = items
      .filter(item => !existingItems.has(item.id))
      .map(item => ({
        user_id: user.id,
        course_id: courseId,
        item_id: item.id,
        completed: true,
        last_accessed: now
      }));

    // 새 항목 추가
    if (itemsToAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('course_progress')
        .insert(itemsToAdd);

      if (insertError) throw insertError;
    }

    // 기존 항목 업데이트
    if (existingProgress && existingProgress.length > 0) {
      const { error: updateError } = await supabase
        .from('course_progress')
        .update({ completed: true, last_accessed: now })
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (updateError) throw updateError;
    }

    return true;
  } catch (error) {
    console.error('코스 완료 처리 실패:', error);
    return false;
  }
}

// 글쓰기 완료 표시 함수
export async function markWritingCompleted(courseId: string, content: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  try {
    // 사용자 프로필 정보 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, nickname')
      .eq('id', user.id)
      .single();
    
    const userName = profile?.nickname || profile?.name || '익명';

    // 기존 글쓰기가 있는지 확인
    const { data: existingWriting } = await supabase
      .from('course_writings')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existingWriting) {
      // 기존 글쓰기 업데이트
      const { error: updateError } = await supabase
        .from('course_writings')
        .update({
          content,
          updated_at: now
        })
        .eq('id', existingWriting.id);

      if (updateError) throw updateError;
    } else {
      // 새 글쓰기 작성
      const { error: insertError } = await supabase
        .from('course_writings')
        .insert({
          user_id: user.id,
          user_name: userName,
          course_id: courseId,
          content,
          is_public: true,
          created_at: now,
          updated_at: now
        });

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error('글쓰기 완료 처리 실패:', error);
    return false;
  }
}