
import { Lecture } from '@/app/types/knowledge/lecture';
import { getCurrentUser, requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 모든 강의 목록 조회
export async function fetchLectures(): Promise<Lecture[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('강의 목록 조회 실패:', error);
    return [];
  }
}

// 검색어로 강의 조회
export async function searchLectures(query: string): Promise<Lecture[]> {
  try {
    const supabase = createClient();
    
    const searchPattern = `%${query}%`;
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .or(`title.ilike.${searchPattern},keyword.ilike.${searchPattern},category.ilike.${searchPattern}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('강의 검색 실패:', error);
    return [];
  } 
}

// 카테고리별 강의 조회
export async function fetchLecturesByCategory(category: string): Promise<Lecture[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('카테고리별 강의 조회 실패:', error);
    return [];
  }
}

// 강의 생성
export async function createLecture(): Promise<Lecture | null> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 사용자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // 일반 회원이면 바로 return null
    if (profile?.role === 'normal') {
      return null;
    }

    const { data, error } = await supabase
      .from('lectures')
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('강의 생성 실패:', error);
    return null;
  }
}

// 강의 업데이트
export async function updateLecture(lectureId: number): Promise<Lecture | null> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

     // 사용자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // 일반 회원이면 바로 return null
    if (profile?.role === 'normal') {
      return null;
    }

    // 강의 작성자 확인
    const { data: lecture } = await supabase
      .from('lectures')
      .select('instructor_id')
      .eq('id', lectureId)
      .single();

    if (!lecture) throw new Error('강의를 찾을 수 없습니다.');

    const isAuthor = lecture.instructor_id === user.id;    
    if (!isAuthor) return null;
    
    const { data, error } = await supabase
      .from('lectures')
      .update({})
      .eq('id', lectureId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('강의 업데이트 실패:', error);
    return null;
  }
}

// 강의 삭제
export async function deleteLecture(lectureId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
    // 강의 작성자 확인
    const { data: lecture } = await supabase
      .from('lectures')
      .select('instructor_id')
      .eq('id', lectureId)
      .single();
    
    if (!lecture) return false;

    const isAuthor = lecture.instructor_id === user.id;
    if (!isAuthor) return false;
    
    const { error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', lectureId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('강의 삭제 실패:', error);
    return false;
  }
}

// 강의 상세 조회
export async function fetchLectureById(lectureId: number): Promise<Lecture | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('강의 상세 조회 실패:', error);
    return null;
  }
}

// 강의 좋아요 토글
export async function toggleLectureLike(lectureId: number, userId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    // 이미 좋아요했는지 확인
    const { data: existingLike } = await supabase
      .from('lecture_likes')
      .select('id')
      .eq('lecture_id', lectureId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLike) {
      // 좋아요 취소
      const { error: deleteError } = await supabase
        .from('lecture_likes')
        .delete()
        .eq('lecture_id', lectureId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // 현재 좋아요 수 조회
      const { data: lectureData } = await supabase
        .from('lectures')
        .select('likes')
        .eq('id', lectureId)
        .single();

      if (lectureData && lectureData.likes > 0) {
        // 좋아요 수 감소
        const { error: updateError } = await supabase
          .from('lectures')
          .update({ likes: lectureData.likes - 1 })
          .eq('id', lectureId);

        if (updateError) throw updateError;
      }
      return false;
    } else {
      // 좋아요 추가
      const { error: insertError } = await supabase
        .from('lecture_likes')
        .insert({
          lecture_id: lectureId,
          user_id: userId
        });

      if (insertError) throw insertError;

      // 현재 좋아요 수 조회
      const { data: lectureData } = await supabase
        .from('lectures')
        .select('likes')
        .eq('id', lectureId)
        .single();

      if (lectureData) {
        // 좋아요 수 증가
        const { error: updateError } = await supabase
          .from('lectures')
          .update({ likes: (lectureData.likes || 0) + 1 })
          .eq('id', lectureId);

        if (updateError) throw updateError;
      }
      return true;
    }
  } catch (error) {
    console.error('좋아요 토글 실패:', error);
    throw error;
  }
}

// 사용자의 좋아요 상태 확인
export async function isLectureLiked(lectureId: number, userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('lecture_likes')
      .select('id')
      .eq('lecture_id', lectureId)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('좋아요 상태 확인 실패:', error);
    return false;
  }
}

// 위시리스트 조회
export async function fetchWishlist() {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    
    if (!user) throw new Error('로그인이 필요합니다.');

    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        *,
        lecture:lectures(
          id,
          title,
          thumbnail_url,
          category,
          instructor,
          depth,
          keyword,
          group_type,    
          likes,
          students,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('위시리스트 조회 실패:', error);
    return [];
  }
}

// 평균 별점 가져오기
export async function fetchAverageRating(lectureId: number) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('lecture_id', lectureId);

    if (error) throw error;

    if (!data || data.length === 0) return 0;

    const average = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
    return parseFloat(average.toFixed(1));
  } catch (error) {
    console.error('평균 별점 조회 실패:', error);
    return 0;
  }
}