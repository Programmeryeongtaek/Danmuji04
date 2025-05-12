import { createClient } from '../supabase/client';

export async function getLikeDataForUser(
  table: string,
  itemId: string | number,
  userId: string | null | undefined,
  idField: string = 'id'
) {
  const supabase = createClient();

  // 좋아요 수 조회
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(`${idField}`, itemId);

  // 사용자 좋아요 여부 확인
  let isLiked = false;
  if (userId) {
    const { data } = await supabase
      .from(table)
      .select('id')
      .eq(`${idField}`, itemId)
      .eq('user_id', userId)
      .maybeSingle();
    isLiked = !!data;
  }

  return {
    likes_count: count || 0,
    is_liked: isLiked
  };
}