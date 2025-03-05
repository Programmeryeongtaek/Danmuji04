import { createBrowserClient } from '@supabase/ssr'

interface EnrollmentResponse {
  data: { status: string } | null;
  error: Error | null;
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Anon Key')
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
}
// 강의 아이템 완료 표시
export async function markItemAsCompleted(lectureId: number, itemId: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('로그인이 필요합니다');

  return await supabase
    .from('lecture_progress')
    .upsert({
      user_id: user.id,
      lecture_id: lectureId,
      item_id: itemId,
      progress: true,
      updated_at: new Date().toISOString()
    })
}

// 마지막 시청 위치 저장
export async function saveLastWatchedItem(lectureId: number, itemId: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('로그인이 필요합니다');

  return await supabase
    .from('last_watched_items')
    .upsert({
      user_id: user.id,
      lecture_id: lectureId,
      item_id: itemId,
      updated_at: new Date().toISOString()
    });
}

// 완료된 강의 아이템 조회
export async function getCompletedItems(lectureId: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from('lecture_progress')
    .select('item_id')
    .eq('user_id', user.id)
    .eq('lecture_id', lectureId)
    .eq('completed', true);

    return data?.map(item => item.item_id) || [];
}

// 마지막 시청 위치 조회
export async function getLastWatchedItem(letctureId: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('last_watched_items')
    .select('item_id')
    .eq('user_id', user.id)
    .eq('lecture_id', letctureId)
    .single();

  return data?.item_id || null;
}

// 강의 관련 함수들
export async function fetchLectures() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function searchLectures(query: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .or(
      `title.ilike.%${query}%,keyword.ilike.%${query}%`
    )

  if (error) throw error;
  return data;
}

// 카테고리별 강의 조회
export async function fetchLecturesByCategory(category: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// 찜하기
export async function fetchWishlist() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
}

// 수강평 관련 함수들 추가
export async function fetchReviewsByLectureId(lectureId: number) {
  const supabase = createClient();
  
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();

  // 1. 기본 리뷰 데이터 조회
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('*')
    .eq('lecture_id', lectureId)
    .order('created_at', { ascending: false });

  if (reviewsError) throw reviewsError;
  if (!reviews) return [];

  // 2. 프로필 정보를 한 번에 조회
  const userIds = [...new Set(reviews.map(review => review.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // 3. 각 리뷰의 답글과 프로필 정보를 처리
  const reviewsWithDetails = await Promise.all(reviews.map(async (review) => {
    const profile = profileMap.get(review.user_id);

    // 좋아요 정보 조회
    const [{ count: reviewLikes }, userLikeData] = await Promise.all([
      supabase
        .from('review_likes')
        .select('*', { count: 'exact' })
        .eq('review_id', review.id),
      user ? supabase
        .from('review_likes')
        .select('id')
        .eq('review_id', review.id)
        .eq('user_id', user.id)
        .maybeSingle() : Promise.resolve({ data: null })
    ]);

    // 리뷰의 답글들 조회
    const { data: replies } = await supabase
    .from('review_replies')
    .select('*')
    .eq('review_id', review.id)
    .order('created_at', { ascending: true });

    // 답글 작성자들의 프로필 정보를 한 번에 조회
    const replyUserIds = [...new Set(replies?.map(reply => reply.user_id) || [])];
    const { data: replyProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', replyUserIds);

    const replyProfileMap = new Map(replyProfiles?.map(p => [p.id, p]) || []);

    // 답글 정보 처리
    const repliesWithDetails = replies ? await Promise.all(
      replies.map(async (reply) => {
        const replyProfile = replyProfileMap.get(reply.user_id);

        // 답글 좋아요 정보 조회
        const [{ count: replyLikes }, replyUserLikeData] = await Promise.all([
          supabase
            .from('review_reply_likes')
            .select('*', { count: 'exact' })
            .eq('reply_id', reply.id),
          user ? supabase
            .from('review_reply_likes')
            .select('id')
            .eq('reply_id', reply.id)
            .eq('user_id', user.id)
            .maybeSingle() : Promise.resolve({ data: null })
        ]);

        // 프로필 이미지 URL 생성
        let avatarUrl = null;
        if (replyProfile?.avatar_url) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(replyProfile.avatar_url);
          avatarUrl = publicUrl;
        }

        return {
          ...reply,
          user_profile: {
            name: replyProfile?.name || '익명',
            nickname: replyProfile?.nickname,
            avatar_url: avatarUrl
          },
          likes_count: replyLikes || 0,
          is_liked: !!replyUserLikeData?.data
        };
      })
    ) : [];

    // 리뷰 프로필 이미지 URL 생성
    let avatarUrl = null;
    if (profile?.avatar_url) {
      const { data: { publicUrl } } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(profile.avatar_url);
      avatarUrl = publicUrl;
    }

    return {
      ...review,
      user_profile: {
        name: profile?.name || '익명',
        nickname: profile?.nickname,
        avatar_url: avatarUrl
      },
      likes_count: reviewLikes || 0,
      is_liked: !!userLikeData?.data,
      replies: repliesWithDetails
    };
  }));

  return reviewsWithDetails;
}

export async function getActiveEnrollment(
  lectureId: number, 
  userId: string 
): Promise<EnrollmentResponse> {
  const supabase = createClient();
  return await supabase
    .from('enrollments')
    .select('status')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .maybeSingle();  // single() 대신 maybeSingle() 사용
}

export async function insertEnrollment(lectureId: number, userId: string) {
  const supabase = createClient();
  return await supabase
    .from('enrollments')
    .insert({
      lecture_id: lectureId,
      user_id: userId,
      status: 'active',
      payment_status: 'free'
    });
}

export async function updateEnrollmentStatus(lectureId: number, userId: string, status: 'active' | 'cancelled') {
  const supabase = createClient();
  return await supabase
    .from('enrollments')
    .update({ status })
    .eq('lecture_id', lectureId)
    .eq('user_id', userId);
}

export async function getExistingReview(lectureId: number, userId: string) {
  const supabase = createClient();
  return await supabase
    .from('reviews')
    .select('id')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .maybeSingle();
}

export async function insertReview(lectureId: number, userId: string, rating: number, content: string) {
  const supabase = createClient();
  return await supabase
    .from('reviews')
    .insert({
      lecture_id: lectureId,
      user_id: userId,
      rating,
      content
    })
    .select()
    .single();
}

export async function getActiveEnrollmentCount(lectureId: number) {
  const supabase = createClient();
  const { data, error, count } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact' }) // 정확한 카운트 요청
    .eq('lecture_id', lectureId)
    .eq('status', 'active');

    if (error) {
      console.error('수강생 수 조회 실패:', error);
      throw error;
    }
    
    // count가 undefined인 경우 data의 길이 사용
    const totalCount = count !== null && count !== undefined ? count : (data?.length || 0);
    return totalCount;
}

export async function updateLectureStudentCount(lectureId: number, count: number) {
  const supabase = createClient();
  return await supabase
    .from('lectures')
    .update({ students: count })
    .eq('id', lectureId);
}

// 수강신청을 위한 로그인 확인
export async function checkEnrollment(lectureId: number) {
  const supabase = createClient();
  const {data: {user} } = await supabase.auth.getUser();

  if (!user) throw new Error('로그인이 필요합니다.');

  const { data: enrollment } = await getActiveEnrollment(lectureId, user.id);
  return !!enrollment;
}

// 기본 함수들을 조합하여 더 복잡한 작업을 수행하는 함수를 생성성
export async function enrollLecture(lectureId: number) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('로그인이 필요합니다.');
  }

  try {
    // 수강 신청
    const { error: enrollError } = await insertEnrollment(lectureId, user.id);
    if (enrollError) {
      throw enrollError;
    }

    // 활성 수강생 수 조회
    const { count, error: countError } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact' })
      .eq('lecture_id', lectureId)
      .eq('status', 'active');
      
    if (countError) throw countError;
    
    // 수강생 수 직접 업데이트
    const { error: updateError } = await supabase
      .from('lectures')
      .update({ students: count || 0 })
      .eq('id', lectureId);
      
    if (updateError) {
      console.error('수강생 수 업데이트 실패:', updateError);
      throw updateError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('수강 신청 처리 중 오류:', error);
    throw error;
  }
}

export async function createReview(lectureId: number, rating: number, content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  // 수강 상태 확인
  const { data: enrollment } = await getActiveEnrollment(lectureId, user.id);
  if (!enrollment) throw new Error('수강 중인 강의만 수강평을 작성할 수 있습니다.');

  // 기존 리뷰 확인
  const { data: existingReview } = await getExistingReview(lectureId, user.id);
  if (existingReview) throw new Error('이미 수강평을 작성하였습니다.');

  // 리뷰 작성
  return await insertReview(lectureId, user.id, rating, content);
}

// 수강평 수정
export async function updateReview(reviewId: number, userId: string, content: string) {
  const supabase = createClient();
  
  // 리뷰 생성 시간 확인
  const { data: review } = await supabase
    .from('reviews')
    .select('created_at')
    .eq('id', reviewId)
    .single();

  if (!review) throw new Error('리뷰를 찾을 수 없습니다.');

  const createdAt = new Date(review.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation > 24) {
    throw new Error('작성 후 24시간이 지난 리뷰는 수정할 수 없습니다.');
  }

  return await supabase
    .from('reviews')
    .update({ content })
    .eq('id', reviewId)
    .eq('user_id', userId)
    .select()
    .single();
}

// 수강평 삭제
export async function deleteReview(reviewId: number, userId: string) {
  const supabase = createClient();

  console.log('Deleting review:', reviewId, userId); // 디버깅용
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId);

  if (error) throw error;
}

// 수강평 좋아요
export async function toggleReviewLike(reviewId: number, userId: string) {
  const supabase = createClient();
  const { data: existingLike } = await supabase
    .from('review_likes')
    .select()
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingLike) {
    await supabase
      .from('review_likes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('review_likes')
      .insert({
        review_id: reviewId,
        user_id: userId,
      });
  }
}

// 답글 좋아요
export async function toggleReplyLike(replyId: number, userId: string) {
  const supabase = createClient();
  const { data: existingLike } = await supabase
    .from('review_reply_likes')
    .select()
    .eq('reply_id', replyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingLike) {
    await supabase
      .from('review_reply_likes')
      .delete()
      .eq('reply_id', replyId)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('review_reply_likes')
      .insert({
        reply_id: replyId,
        user_id: userId,
      });
  }
}

// 수강평 답글 작성
export async function addReviewReply(reviewId: number, userId: string, content: string) {
  const supabase = createClient();
  
  try {
    // 1. 먼저 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, nickname, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // 2. 답글 추가
    const { data: reply, error: replyError } = await supabase
      .from('review_replies')
      .insert({
        review_id: reviewId,
        user_id: userId,
        content,
      })
      .select()
      .single();

    if (replyError) throw replyError;

    // 3. 이미지 URL 처리
    let avatarUrl = null;
    if (profile?.avatar_url) {
      const { data: urlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(profile.avatar_url);
      avatarUrl = urlData.publicUrl;
    }

    // 4. 완성된 데이터 반환
    return {
      id: reply.id,
      content: reply.content,
      created_at: reply.created_at,
      user_id: userId,
      user_profile: {
        id: profile.id,
        name: profile.name || '익명',
        nickname: profile.nickname,
        avatar_url: avatarUrl
      },
      likes_count: 0,
      is_liked: false
    };
  } catch (error) {
    console.error('Error adding review reply:', error);
    throw error;
  }
}

// 수강평 답글 수정
export async function updateReviewReply(replyId: number, userId: string, content: string) {
  const supabase = createClient();
  
  const { data: reply } = await supabase
    .from('review_replies')
    .select('created_at')
    .eq('id', replyId)
    .single();

  if (!reply) throw new Error('답글을 찾을 수 없습니다.');

  const hoursSinceCreation = (new Date().getTime() - new Date(reply.created_at).getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation > 24) {
    throw new Error('작성 후 24시간이 지난 답글은 수정할 수 없습니다.');
  }

  return await supabase
    .from('review_replies')
    .update({ content })
    .eq('id', replyId)
    .eq('user_id', userId)
    .select()
    .single();
}

// 수강평 답글 삭제
export async function deleteReviewReply(replyId: number, userId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('review_replies')
    .delete()
    .eq('id', replyId)
    .eq('user_id', userId);
    
  if (error) throw error;
}

// 유료 강의 체크
export async function isFreeLecture(lectureId: number): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('price')
    .eq('id', lectureId)
    .single();

  if (error) throw error;
  return data?.price === 0;
}

// 수강 취소
export async function cancelEnrollment(lectureId: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  // 무료 강의 여부 체크
  const isFree = await isFreeLecture(lectureId);
  if (!isFree) throw new Error('무료 강의만 취소할 수 있습니다.');

  // 수강 상태 확인
  const { data: enrollment } = await getActiveEnrollment(lectureId, user.id);
  if (!enrollment) throw new Error('수강 중인 강의가 아닙니다.');

  // 수강 취소
  const { error } = await updateEnrollmentStatus(lectureId, user.id, 'cancelled');
  if (error) throw error;

  // 수강생 수 업데이트
  const count = await getActiveEnrollmentCount(lectureId);
  await updateLectureStudentCount(lectureId, count);
}

// 평균 별점 가져오기
export async function fetchAverageRating(lectureId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('lecture_id', lectureId);

  if (error) throw error;

  if (!data || data.length === 0 ) return 0;

  const average = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
  return parseFloat(average.toFixed(1));
}

// 사용자의 리뷰 존재 여부 확인
export async function hasUserReviewed(lectureId: number, userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .single();

  // error.code가 'PGRST116'인 경우 = 리뷰를 찾을 수 없음 = 사용자가 아직 리뷰를 작성하지 않음
  // 이는 실제 에러가 아니므로 무시하고 false를 반환

  // 그 외의 에러(DB 연결 실패 등)는 실제 에러이므로 throw
  if (error && error.code !== 'PGRST116') throw error;
  return !!data; // 데이터가 있으면 true, 없으면 false
}