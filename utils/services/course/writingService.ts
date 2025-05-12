import { WritingWithDetails } from '@/app/types/course/courseModel';
import { CourseWriting, WritingFormData } from '@/app/types/course/courseTypes';
import { requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 글쓰기를 저장하거나 업데이트
export async function saveWriting(
  courseId: string, 
  itemId: string, 
  formData: WritingFormData
): Promise<CourseWriting> {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
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
  } catch (error) {
    console.error('글쓰기 저장 실패:', error);
    throw error;
  }
}

// 글쓰기 조회
export async function fetchUserWriting(courseId: string, itemId: string): Promise<CourseWriting | null> {
  try {
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
  } catch (error) {
    console.error('사용자 글쓰기 조회 실패:', error);
    return null;
  }
}

// 공개된 다른 사용자 글 쓴 내용 조회
export async function fetchPublicWritings(courseId: string, itemId: string): Promise<CourseWriting[]> {
  try {
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
  } catch (error) {
    console.error('공개 글쓰기 조회 실패:', error);
    return [];
  }
}

// 사용자의 모든 글쓰기 조회 (코스 및 아이템 정보 포함)
export async function fetchAllUserWritings(): Promise<WritingWithDetails[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];
    
    // 사용자의 모든 글쓰기 조회 (관련 정보와 함께)
    const { data, error } = await supabase
      .from('course_writings')
      .select(`
        *,
        course:courses!inner (
          id,
          title,
          category
        ),
        item:course_items!inner (
          id,
          title
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // WritingWithDetails 타입으로 변환
    return (data || []).map(writing => ({
      id: writing.id,
      user_id: writing.user_id,
      user_name: writing.user_name,
      course_id: writing.course_id,
      item_id: writing.item_id,
      content: writing.content,
      is_public: writing.is_public,
      created_at: writing.created_at,
      updated_at: writing.updated_at,
      course: writing.course,
      item: writing.item
    }));
  } catch (error) {
    console.error('사용자 글쓰기 조회 실패:', error);
    throw error;
  }
}