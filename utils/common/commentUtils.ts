import { createClient } from '../supabase/client';
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

  // 2. 각 댓글에 대해 작성자 정보와 기타 데이터 가져오기
  return await Promise.all(comments.map(async (comment): Promise<CommentWithDetails> => {
    // 작성자 정보 가져오기
    let author = null;
    let avatarUrl = null;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, nickname, avatar_url')
        .eq('id', comment.author_id)
        .single();
      
      if (profile) {
        author = profile;
        
        // 아바타 URL 처리
        if (profile.avatar_url) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(profile.avatar_url);
          avatarUrl = publicUrl;
        }
      }
    } catch (profileError) {
      console.error('Failed to fetch profile for author:', comment.author_id, profileError);
    }

    // 좋아요 데이터 가져오기
    const likeData = await getLikeDataForUser('comment_likes', comment.id, currentUserId, 'comment_id');

    // 대댓글 가져오기 (재귀)
    const replies = parentId === null ?
      await fetchCommentsWithDetails(postId, currentUserId, comment.id) :
      [];

    return {
      ...comment,
      author_name: author?.nickname || author?.name || '익명',
      author_avatar: avatarUrl,
      likes_count: likeData.likes_count,
      is_liked: likeData.is_liked,
      replies
    };
  }));
}