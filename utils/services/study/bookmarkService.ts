import { requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 스터디 북마크 토글
export async function toggleStudyBookmark(studyId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 기존 북마크 확인
    const { data: existingBookmark } = await supabase
      .from('study_bookmarks')
      .select('id')
      .eq('study_id', studyId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existingBookmark) {
      // 북마크 제거
      const { error } = await supabase
        .from('study_bookmarks')
        .delete()
        .eq('id', existingBookmark.id);
      
      if (error) throw error;
      return false; // 북마크 제거됨
    } else {
      // 북마크 추가
      const { error } = await supabase
        .from('study_bookmarks')
        .insert({
          study_id: studyId,
          user_id: user.id,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      return true; // 북마크 추가됨
    }
  } catch (error) {
    console.error('북마크 토글 실패:', error);
    throw error;
  }
}

// 북마크 상태 확인
export async function isStudyBookmarked(studyId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('study_bookmarks')
      .select('id')
      .eq('study_id', studyId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('북마크 상태 확인 실패:', error);
    return false;
  }
}

// 북마크 메모 업데이트
export async function updateBookmarkNotes(bookmarkId: string, notes: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    const { error } = await supabase
      .from('study_bookmarks')
      .update({ notes })
      .eq('id', bookmarkId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('북마크 메모 업데이트 실패:', error);
    return false;
  }
}

// 북마크 중요도 업데이트
export async function updateBookmarkImportance(bookmarkId: number, importance: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
    const { error } = await supabase
      .from('study_bookmarks')
      .update({ importance })
      .eq('id', bookmarkId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('북마크 중요도 업데이트 실패:', error);
    return false;
  }
}