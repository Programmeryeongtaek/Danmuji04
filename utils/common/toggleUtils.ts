import { createClient } from '../supabase/client';

export async function toggleRelation(
  table: string,
  itemId: string | number,
  userId: string,
  idField: string = 'id'
) {
  const supabase = createClient();

  // 기존 관계 확인
  const { data: existing } = await supabase
    .from(table)
    .select('id')
    .eq(`${idField}`, itemId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // 제거
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', existing.id);
    
    if (error) throw error;
    return false; // 제거됨
  } else {
    // 추가
    const { error } = await supabase
      .from(table)
      .insert({
        [`${idField}`]: itemId,
        user_id: userId
      });

    if (error) throw error;
    return true; // 추가됨
  }
}