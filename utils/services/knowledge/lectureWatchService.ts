import { getCurrentUser, requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 아이템 완료 표시
export async function markItemAsCompleted(lectureId: number, itemId: number) {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
    // 이미 진행 상태가 있는지 확인
    const { data: existingProgress } = await supabase
      .from('lecture_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('lecture_id', lectureId)
      .eq('item_id', itemId)
      .maybeSingle();
    
    const now = new Date().toISOString();
    
    if (existingProgress) {
      // 기존 진행 상태 업데이트
      const { error } = await supabase
        .from('lecture_progress')
        .update({
          completed: true,
          updated_at: now
        })
        .eq('id', existingProgress.id);
      
      if (error) throw error;
    } else {
      // 새 진행 상태 생성
      const { error } = await supabase
        .from('lecture_progress')
        .insert({
          user_id: user.id,
          lecture_id: lectureId,
          item_id: itemId,
          completed: true,
          created_at: now,
          updated_at: now
        });
      
      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error('완료 상태 저장 실패:', error);
    throw error;
  }
}

// 마지막 시청 위치 저장
export async function saveLastWatchedItem(lectureId: number, itemId: number) {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
    // 먼저 기존 레코드 확인
    const { data: existing } = await supabase
      .from('last_watched_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (existing) {
      // 기존 레코드 업데이트
      return await supabase
        .from('last_watched_items')
        .update({ 
          item_id: itemId,
          updated_at: new Date().toISOString() 
        })
        .eq('id', existing.id);
    } else {
      // 새 레코드 삽입
      return await supabase
        .from('last_watched_items')
        .insert({
          user_id: user.id,
          lecture_id: lectureId,
          item_id: itemId,
          updated_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('마지막 시청 위치 저장 실패:', error);
    throw error;
  }
}

// 완료된 강의 아이템 조회
export async function getCompletedItems(lectureId: number) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) return [];

    const { data } = await supabase
      .from('lecture_progress')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('lecture_id', lectureId)
      .eq('completed', true);

    return data?.map(item => item.item_id) || [];
  } catch (error) {
    console.error('완료된 아이템 조회 실패:', error);
    return [];
  }
}

// 마지막 시청 위치 조회
export async function getLastWatchedItem(lectureId: number) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    
    if (!user) return null;

    const { data, error } = await supabase
      .from('last_watched_items')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('lecture_id', lectureId)
      .maybeSingle();
    
    if (error) {
      console.error('마지막 시청 위치 조회 중 오류:', error);
      return null;
    }

    return data?.item_id || null;
  } catch (error) {
    console.error('마지막 시청 위치 조회 중 예외 발생:', error);
    return null;
  }
}

// 강의 전체 진행률 계산
export async function calculateEnrollmentProgress(
  lectureId: number,
  userId: string
): Promise<number> {
  try {
    const supabase = createClient();

    // 1. 해당 강의의 섹션 ID 목록 가져오기
    const { data: sections, error: sectionError } = await supabase
      .from('lecture_sections')
      .select('id')
      .eq('lecture_id', lectureId);

    if (sectionError) {
      console.error('섹션 조회 오류:', sectionError);
      return 0;
    }
    if (!sections || sections.length === 0) return 0;

    const sectionIds = sections.map(section => section.id);


    // 2. 해당 섹션들의 모든 아이템 수 조회
    const { count: totalItems, error: countError } = await supabase
      .from('lecture_items')
      .select('*', { count: 'exact', head: true })
      .in('section_id', sectionIds);

    if (countError) {
      console.error('아이템 수 조회 오류:', countError);
      return 0;
    }
    
    if (!totalItems || totalItems === 0) return 0;

    // 3. 완료된 아이템 수 조회
    const { count: completedItems, error: completedError } = await supabase
      .from('lecture_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('lecture_id', lectureId)
      .eq('completed', true);

    if (completedError) {
      console.error('완료된 아이템 조회 오류:', completedError);
      return 0;
    }
    if (!completedItems) return 0;

    // 4. 진행률 계산 (백분율)
    const progress = (completedItems / totalItems) * 100;
    
    // 소수점 둘째 자리에서 반올림
    return Math.round(progress);
  } catch (error) {
    console.error('진행률 계산 실패:', error);
    return 0;
  }
}