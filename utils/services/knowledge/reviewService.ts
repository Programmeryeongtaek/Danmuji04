import { getAvatarUrl } from '@/utils/common/avatarUtils';
import { getLikeDataForUser } from '@/utils/common/likeUtils';
import { getProfileWithAvatar } from '@/utils/common/profileUtils';
import { toggleRelation } from '@/utils/common/toggleUtils';
import { getCurrentUser, requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 수강평 조회
export async function fetchReviewsByLectureId(lectureId: number) {
  try {
    const supabase = createClient();
    
    // 현재 로그인한 사용자 정보 가져오기
    const user = await getCurrentUser();

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

      // getLikeDataForUser 함수 사용
      const reviewLikesData = await getLikeDataForUser('review_likes', review.id, user?.id, 'review_id');

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

          // getLikeDataForUser 함수 사용
          const replyLikesData = await getLikeDataForUser('review_reply_likes', reply.id, user?.id, 'reply_id');

          // 프로필 이미지
          const avatarUrl = getAvatarUrl(replyProfile?.avatar_url);

          return {
            ...reply,
            user_profile: {
              name: replyProfile?.name || '익명',
              nickname: replyProfile?.nickname,
              avatar_url: avatarUrl
            },
            likes_count: replyLikesData.likes_count,
            is_liked: replyLikesData.is_liked
          };
        })
      ) : [];

      // 리뷰 프로필 이미지
      const avatarUrl = getAvatarUrl(profile?.avatar_url);

      return {
        ...review,
        user_profile: {
          name: profile?.name || '익명',
          nickname: profile?.nickname,
          avatar_url: avatarUrl
        },
        likes_count: reviewLikesData.likes_count,
        is_liked: reviewLikesData.is_liked,
        replies: repliesWithDetails
      };
    }));

    return reviewsWithDetails;
  } catch (error) {
    console.error('수강평 조회 실패:', error);
    return [];
  }
}

// 수강평 작성
export async function createReview(lectureId: number, rating: number, content: string) {
  try {
    const user = await getCurrentUser();

    if (!user) throw new Error('로그인이 필요합니다.');

    // 수강 상태 확인
    const { data: enrollment } = await getActiveEnrollment(lectureId, user.id);
    if (!enrollment) throw new Error('수강 중인 강의만 수강평을 작성할 수 있습니다.');

    // 기존 리뷰 확인
    const { data: existingReview } = await getExistingReview(lectureId, user.id);
    if (existingReview) throw new Error('이미 수강평이 작성하였습니다.');

    // 리뷰 작성
    return await insertReview(lectureId, user.id, rating, content);
  } catch (error) {
    console.error('수강평 작성 실패:', error);
    throw error;
  }
}

// 수강평 수정
export async function updateReview(reviewId: number, content: string) {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
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
      .eq('user_id', user.id)
      .select()
      .single();
  } catch (error) {
    console.error('수강평 수정 실패:', error);
    throw error;
  }
}

// 수강평 삭제
export async function deleteReview(reviewId: number) {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('수강평 삭제 실패:', error);
    throw error;
  }
}

// 수강평 좋아요 토글
export async function toggleReviewLike(reviewId: number, userId: string) {
  return await toggleRelation('review_likes', reviewId, userId, 'review_id');
}

// 수강평 답글 작성
export async function addReviewReply(reviewId: number, content: string) {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 1. 답글 추가
    const { data: reply, error: replyError } = await supabase
      .from('review_replies')
      .insert({
        review_id: reviewId,
        user_id: user.id,
        content,
      })
      .select()
      .single();

    if (replyError) throw replyError;

    // 2. 프로필 정보 조회
    const profile = await getProfileWithAvatar(user.id);
    
    // 3. 완성된 데이터 변환
    return {
      id: reply.id,
      content: reply.content,
      created_at: reply.created_at,
      user_id: reply.user_id,
      user_profile: profile,
      likes_count: 0,
      is_liked: false
    };
  } catch (error) {
    console.error('답글 작성 실패:', error);
    throw error;
  }
}

// 수강평 답글 수정
export async function updateReviewReply(replyId: number, content: string) {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
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
      .eq('user_id', user.id)
      .select()
      .single();
  } catch (error) {
    console.error('답글 수정 실패:', error);
    throw error;
  }
}

// 수강평 답글 삭제
export async function deleteReviewReply(replyId: number) {
  try {
    const supabase = createClient();
    const user = await requireAuth();
    
    const { error } = await supabase
      .from('review_replies')
      .delete()
      .eq('id', replyId)
      .eq('user_id', user.id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('답글 삭제 실패:', error);
    throw error;
  }
}

// 답글 좋아요
export async function toggleReplyLike(replyId: number, userId: string) {
  return await toggleRelation('review_reply_likes', replyId, userId, 'reply_id');
}

// // 수강 상태 확인을 위한 헬퍼 함수들
async function getActiveEnrollment(lectureId: number, userId: string) {
  const supabase = createClient();
  return await supabase
    .from('enrollments')
    .select('status')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .maybeSingle();
}

async function getExistingReview(lectureId: number, userId: string) {
  const supabase = createClient();
  return await supabase
    .from('reviews')
    .select('id')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .maybeSingle();
}

async function insertReview(lectureId: number, userId: string, rating: number, content: string) {
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