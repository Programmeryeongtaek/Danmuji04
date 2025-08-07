import { createClient } from '../supabase/client';
import { getAvatarUrl } from './avatarUtils';
import { getLikeDataForUser } from './likeUtils';

interface CommentRaw {
  id: number;
  post_id: number;
  author_id: string;
  content: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

// 타입 정의 추가
export interface CommentWithDetails extends CommentRaw {
  author_name: string;
  author_avatar: string | null;
  likes_count: number;
  is_liked: boolean;
  replies: CommentWithDetails[];
}

export async function fetchCommentsWithDetails(
  postId: number,
  currentUserId: string | null | undefined,
  parentId: number | null = null
): Promise<CommentWithDetails[]> {
  const supabase = createClient();

  // 1. 먼저 댓글만 가져오기
  let query = supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  // parentId 조건 추가
  if (parentId === null) {
    query = query.is('parent_id', null);
  } else {
    query = query.eq('parent_id', parentId);
  }

  const { data: comments, error } = await query;

  if (error) {
    throw error;
  }
  
  if (!comments || comments.length === 0) {
    return [];
  }

  // 2. 모든 작성자 ID 수집
  const authorIds = [...new Set(comments.map(comment => comment.author_id))];

  // 3. 프로필 정보 한 번에 조회 (최신 데이터)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, nickname, avatar_url, updated_at')
    .in('id', authorIds)
    .order('updated_at', { ascending: false });

  if (profilesError) {
    console.error('프로필 조회 실패:', profilesError);
  }

  // 4. 프로필 맵 생성
  const profileMap = new Map(
    profiles?.map(profile => [
      profile.id, 
      {
        id: profile.id,
        name: profile.name,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url
      }
    ]) || []
  );

  // 5. 좋아요 정보 조회
  const commentIds = comments.map(c => c.id);
  const likePromises = commentIds.map(async (commentId) => {
    const likeData = await getLikeDataForUser('comment_likes', commentId, currentUserId, 'comment_id');
    return [commentId, likeData] as const;
  });

  const likeResults = await Promise.all(likePromises);
  const likeMap = new Map(likeResults);

  // 6. 댓글 데이터 조합
  const commentsWithDetails = await Promise.all(
    comments.map(async (comment): Promise<CommentWithDetails> => {
      const profile = profileMap.get(comment.author_id);
      const likeData = likeMap.get(comment.id);

      // 아바타 URL 처리
      const avatarUrl = profile?.avatar_url ? getAvatarUrl(profile.avatar_url) : null;

      // 대댓글 가져오기 (재귀)
      const replies = parentId === null 
        ? await fetchCommentsWithDetails(postId, currentUserId, comment.id) 
        : [];

      return {
        ...comment,
        author_name: profile?.nickname || profile?.name || '익명',
        author_avatar: avatarUrl,
        likes_count: likeData?.likes_count || 0,
        is_liked: likeData?.is_liked || false,
        replies
      };
    })
  );

  return commentsWithDetails;
}