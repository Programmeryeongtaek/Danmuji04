import { Comment } from '@/app/types/community/communityType';
import { fetchCommentsWithDetails } from '@/utils/common/commentUtils';
import { getProfileWithAvatar } from '@/utils/common/profileUtils';
import { toggleRelation } from '@/utils/common/toggleUtils';
import { requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 게시글의 댓글 목록 조회
export async function fetchCommentsByPostId(postId: number): Promise<Comment[]> {
    try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // fetchCommentsWithDetails 사용
    const commentsWithDetails = await fetchCommentsWithDetails(postId, user?.id);
    
    // Comment 타입으로 변환 (타입이 동일하면 그대로 반환)
    return commentsWithDetails as Comment[];
  } catch (error) {
    console.error('댓글 목록 조회 실패:', error);
    return [];
  }
}

// 댓글 작성
export async function createComment(
  postId: number,
  content: string,
  parentId: number | null = null
): Promise<Comment> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 1. 댓글 추가
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: content,
        parent_id: parentId
      })
      .select();

    if (error) {
      console.error('댓글 생성 오류:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('댓글 생성 결과가 없습니다');
    }
    
    // 2. 프로필 정보를 기반으로 댓글 객체 생성
    const profile = await getProfileWithAvatar(user.id);

    // 3. 완성된 댓글 객체 생성
    const comment: Comment = {
      ...data[0],
      author_name: profile.name,
      author_avatar: profile.avatar_url,
      likes_count: 0,
      is_liked: false,
      replies: []
    };

    return comment;
  } catch (error) {
    console.error('댓글 생성 중 오류 발생:', error);
    throw error;
  }
}

// 댓글 삭제
export async function deleteComment(commentId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('댓글 삭제 실패:', error);
    return false;
  }
}

// 댓글 수정
export async function updateComment(commentId: number, content: string): Promise<Comment> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 댓글 작성 시간 확인
    const { data: comment } = await supabase
      .from('post_comments')
      .select('created_at')
      .eq('id', commentId)
      .eq('author_id', user.id)
      .single();

    if (!comment) throw new Error('댓글을 찾을 수 없습니다.');

    const createdAt = new Date(comment.created_at);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation > 24) {
      throw new Error('작성 후 24시간이 지난 댓글은 수정할 수 없습니다.');
    }

    const { data, error } = await supabase
      .from('post_comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('author_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Comment;
  } catch (error) {
    console.error('댓글 수정 실패:', error);
    throw error;
  }
}

// 댓글 좋아요 토글
export async function toggleCommentLike(commentId: number, userId: string): Promise<boolean> {
  return await toggleRelation('comment_likes', commentId, userId, 'comment_id');
}