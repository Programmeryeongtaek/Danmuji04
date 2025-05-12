import { createClient } from '@/utils/supabase/client';

// 북마크 선택 삭제
export async function deleteMultipleBookmarks(
  postIds: number[]
): Promise<number> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('인증이 필요합니다.');
    }

    // 여러 북마크를 한 번에 삭제
    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .in('post_id', postIds);
    
    if (error) throw error;
    
    return postIds.length; // 삭제된 항목 수 반환
  } catch (error) {
    console.error('북마크 일괄 삭제 실패:', error);
    throw error;
  }
}

// 북마크에 메모
export async function updateBookmarkMemo(
  postId: number,
  memo: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('인증이 필요합니다.');
    }

    const { error } = await supabase
      .from('post_bookmarks')
      .update({ memo })
      .eq('user_id', user.id)
      .eq('post_id', postId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('북마크 메모 업데이트 실패:', error);
    throw error;
  }
}