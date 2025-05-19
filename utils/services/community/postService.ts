import { BookmarkedPost, FilterOptions, Post } from '@/app/types/community/communityType';
import { getLikeDataForUser } from '@/utils/common/likeUtils';
import { getProfileWithAvatar } from '@/utils/common/profielUtils';
import { toggleRelation } from '@/utils/common/toggleUtils';
import { requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 게시글 작성
export async function createPost(post: {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}): Promise<number> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 게시글 작성
    const { data: postData, error: postError } = await supabase
      .from('community_posts')
      .insert({
        title: post.title,
        content: post.content,
        author_id: user.id,
        category: post.category
      })
      .select('id')
      .single();

    if (postError) throw postError;

    // 태그 생성
    if (post.tags && post.tags.length > 0) {
      const tagData = post.tags.map(tag => ({
        post_id: postData.id,
        tag: tag.trim()
      }));

      const { error: tagsError } = await supabase
        .from('post_tags')
        .insert(tagData);

      if (tagsError) throw tagsError;
    }

    return postData.id;
  } catch (error) {
    console.error('게시글 작성 실패:', error);
    throw error;
  }
}

// 게시글 목록 조회
export async function fetchPosts(options: FilterOptions = {}): Promise<Post[]> {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. 기본 게시글 데이터만 가져오기 - 복잡한 조인 없이
    let query = supabase
      .from('community_posts')
      .select('*');

    // 카테고리 필터링
    if (options.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }

    // 기간 필터링
    if (options.period && options.period !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (options.period) {
        case 'day':
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      query = query.gte('created_at', cutoffDate.toISOString());
    }

    // 정렬
    switch (options.sort) {
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'likes':
        query = query.order('likes', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) return [];
    
    // 2. 각 게시글에 대한 추가 정보를 별도 쿼리로 가져오기
    const enhancedPosts = await Promise.all(data.map(async (post) => {
      try {
        // 태그 조회
        const { data: tagsData } = await supabase
          .from('post_tags')
          .select('tag')
          .eq('post_id', post.id);
        
        const tags = tagsData?.map(item => item.tag) || [];
        
        // getLikeDataForUser 함수 사용
        const likesData = await getLikeDataForUser('post_likes', post.id, user?.id, 'post_id');
        
        // 댓글 수 조회
        const { count: commentsCount } = await supabase
          .from('post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        // 작성자 정보 조회
        const profile = await getProfileWithAvatar(post.author_id);

        return {
          ...post,
          tags,
          author_name: profile.name,
          author_avatar: profile.avatar_url,
          likes_count: likesData.likes_count,
          comments_count: commentsCount || 0,
          is_liked: likesData.is_liked
        };
      } catch (error) {
        console.error(`Error enhancing post ${post.id}:`, error);
        // 기본 데이터만 반환
        return {
          ...post,
          tags: [],
          author_name: '익명',
          author_avatar: null,
          likes_count: 0,
          comments_count: 0,
          is_liked: false
        };
      }
    }));

    // 태그 필터링 (클라이언트 측에서 처리)
    if (options.tag) {
      return enhancedPosts.filter(post => 
        post.tags.some((tag: string) => tag.toLowerCase() === options.tag?.toLowerCase())
      );
    }

    return enhancedPosts;
  } catch (error) {
    console.error('게시글 목록 조회 중 오류 발생:', error);
    return []; // 에러 발생 시 빈 배열 반환
  }
}

// 게시글 검색
export async function searchPosts(query: string, options: FilterOptions = {}): Promise<Post[]> {
  if (!query.trim()) return [];

  try {
    const searchTerm = query.trim().toLowerCase();
    const posts = await fetchPosts(options);

    return posts.filter(post => 
      post.title.toLowerCase().includes(searchTerm) ||
      (post.content?.toLowerCase().includes(searchTerm) ?? false) ||
      post.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  } catch (error) {
    console.error('게시글 검색 중 오류:', error);
    return [];
  }
}

// 게시글 상세 정보 조회
export async function fetchPostById(postId: number): Promise<Post | null> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 조회수 증가 (에러가 발생해도 계속 진행)
    try {
      await supabase.rpc('increment_post_view', { post_id: postId });
    } catch (viewError) {
      console.error('조회수 증가 실패:', viewError);
      // 계속 진행 (조회수 증가 실패해도 게시글을 보여줌)
    }

    // 게시글 기본 정보 조회
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .single();
  
    if (error) {
      console.error('게시글 조회 실패:', error);
      return null;
    }

    if (!data) return null;

    // 추가 정보 조회
    // 1. 태그 조회
    const { data: tagsData } = await supabase
      .from('post_tags')
      .select('tag')
      .eq('post_id', postId);

    const tags = tagsData?.map(item => item.tag) || [];

    // 2. 작성자 정보 조회
    const profile = await getProfileWithAvatar(data.author_id);
    
    // 3. getLikeDataForUser 함수 사용
    const likesData = await getLikeDataForUser('post_likes', postId, user?.id, 'post_id');
    
    // 4. 댓글 개수 조회
    const { count: commentsCount } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    return {
      ...data,
      tags,
      author_name: profile.name,
      author_avatar: profile.avatar_url,
      likes_count: likesData.likes_count,
      comments_count: commentsCount || 0,
      is_liked: likesData.is_liked
    };
  } catch (error) {
    console.error('게시글 상세 조회 중 오류 발생:', error);
    return null;
  }
}

// 북마크 토글 기능
export async function togglePostBookmarks(postId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 기존 북마크 확인
    const { data: existingBookmark } = await supabase
      .from('post_bookmarks')
      .select()
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingBookmark) {
      // 북마크 제거
      const { error } = await supabase
        .from('post_bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return false; // 북마크 제거됨
    } else {
      // 북마크 추가
      const { error } = await supabase
        .from('post_bookmarks')
        .insert({
          post_id: postId,
          user_id: user.id
        });

      if (error) throw error;
      return true; // 북마크 추가됨
    }
  } catch (error) {
    console.error('북마크 토글 실패:', error);
    throw error;
  }
}

// 인기 태그 조회
export async function fetchPopularTags(limit: number = 10): Promise<{name: string, count: number}[]> {
  const supabase = createClient();

  const { data, error} = await supabase.rpc('get_popular_tags', { tag_limit: limit });

  if (error) throw error;
  return data || [];
}

// 관련 게시글 조회
export async function fetchRelatedPosts(postId: number, limit: number = 3): Promise<Post[]> {
  const supabase = createClient();

  try {
    // 현재 게시글의 카테고리와 태그 조회
    const { data: currentPost } = await supabase
      .from('community_posts')
      .select('category')
      .eq('id', postId)
      .single();

    if (!currentPost) return [];

    // 태그 조회
    const { data: tagsData } = await supabase
      .from('post_tags')
      .select('tag')
      .eq('post_id', postId);

    const tags = tagsData?.map(t => t.tag) || [];

    // 관련 게시글 조회 (같은 카테고리 또는 같은 태그)
    let query = supabase
      .from('community_posts')
      .select('*')
      .neq('id', postId);

    // 같은 카테고리 또는 같은 태그가 있는 게시글
    if (tags.length > 0) {
      // 태그가 있으면 태그 기반으로도 검색
      const { data: relatedByTags } = await supabase
        .from('post_tags')
        .select('post_id')
        .in('tag', tags)
        .neq('post_id', postId);

      const relatedPostIds = relatedByTags?.map(r => r.post_id) || [];
      
      query = query.or(`category.eq.${currentPost.category},id.in.(${relatedPostIds.join(',')})`);
    } else {
      // 태그가 없으면 카테고리만으로 검색
      query = query.eq('category', currentPost.category);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // 각 게시글의 추가 정보 조회
    return await Promise.all(data.map(async (post) => {
      try {
        // 태그 조회
        const { data: postTags } = await supabase
          .from('post_tags')
          .select('tag')
          .eq('post_id', post.id);

        // 프로필 조회
        const profile = await getProfileWithAvatar(post.author_id);

        return {
          ...post,
          tags: postTags?.map(t => t.tag) || [],
          author_name: profile.name,
          author_avatar: profile.avatar_url,
          likes_count: 0,  // 간단하게 처리
          comments_count: 0,
          is_liked: false
        };
      } catch (error) {
        console.error(`게시글 ${post.id} 처리 중 오류:`, error);
        return {
          ...post,
          tags: [],
          author_name: '익명',
          author_avatar: null,
          likes_count: 0,
          comments_count: 0,
          is_liked: false
        };
      }
    }));
  } catch (error) {
    console.error('관련 게시글 조회 실패:', error);
    return [];
  }
}

// 게시글 북마크 여부확인
export async function isPostBookmarked(postId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('post_bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('북마크 상태 조회 실패:', error);
    return false;
  }
}

// 게시글 좋아요 토글
export async function togglePostLike(postId: number, userId: string): Promise<boolean> {
  return await toggleRelation('post_likes', postId, userId, 'post_id');
}

// 북마크된 게시글 조회
export async function fetchBookmarkedPosts(
  page: number = 1,
  limit: number = 10
): Promise<BookmarkedPost[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('인증이 필요합니다.');
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. 북마크 정보 가져오기 (별칭 없이)
    const { data: bookmarks, error: bookmarkError } = await supabase
      .from('post_bookmarks')
      .select('post_id, created_at, importance, memo')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (bookmarkError) throw bookmarkError;
    if (!bookmarks || bookmarks.length === 0) return [];

    // 2. 게시글 ID 목록
    const postIds = bookmarks.map(bookmark => bookmark.post_id);

    // 3. 게시글 상세 정보 가져오기
    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select('*')
      .in('id', postIds);

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) return [];

    // 4. 각 게시글에 추가 정보 포함
    const result = await Promise.all(
      posts.map(async (post) => {
        // 해당 게시글의 북마크 정보 찾기
        const bookmarkInfo = bookmarks.find(bm => bm.post_id === post.id);

        if (!bookmarkInfo) return null; // 북마크 정보가 없다면 스킵

        // 태그 조회
        const { data: tagsData } = await supabase
          .from('post_tags')
          .select('tag')
          .eq('post_id', post.id);

        const tags = tagsData?.map(item => item.tag) || [];

        // 좋아요 데이터 조회
        const likesData = await getLikeDataForUser('post_likes', post.id, user.id, 'post_id');
        
        // 댓글 수 조회
        const { count: commentsCount } = await supabase
          .from('post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // 작성자 정보 조회
        const profile = await getProfileWithAvatar(post.author_id);

        return {
          ...post,
          bookmark_created_at: bookmarkInfo.created_at,
          importance: bookmarkInfo.importance || 0,
          memo: bookmarkInfo.memo || '',
          tags,
          author_name: profile.name,
          author_avatar: profile.avatar_url,
          likes_count: likesData.likes_count,
          comments_count: commentsCount || 0,
          is_liked: likesData.is_liked,
          is_bookmarked: true,
        } as BookmarkedPost;
      })
    );

    // null 값 제거하고 반환
    return result.filter((post): post is BookmarkedPost => post !== null);
  } catch (error) {
    console.error('북마크된 게시글 조회 실패:', error);
    throw error;
  }
}

// 게시글 삭제
export async function deletePost(postId: number): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 게시글 작성자 확인
    const { data: post} = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (!post) return false;

    // 작성자 확인
    if (post.author_id !== user.id) {
      throw new Error('게식들 삭제 권한이 없습니다.');
    }

    // 게시글 삭제
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('게시글 삭제 실패:', error);
    throw error;
  }
}

// 게시글 수정
export async function updatePost(postId: number, data: {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}): Promise<Post> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 게시글 작성자 확인
    const { data: post, error: checkError } = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('id', postId)
      .single();
    
    if (checkError) throw checkError;
    if (!post) throw new Error('게시글을 찾을 수 없습니다.');
    
    // 작성자 확인 (자신의 게시글만 수정 가능)
    if (post.author_id !== user.id) {
      throw new Error('게시글 수정 권한이 없습니다.');
    }
    
    // 1. 게시글 업데이트
    const { data: updatedPost, error: updateError } = await supabase
      .from('community_posts')
      .update({
        title: data.title,
        content: data.content,
        category: data.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // 2. 기존 태그 삭제
    const { error: deleteTagsError } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId);
    
    if (deleteTagsError) throw deleteTagsError;
    
    // 3. 새 태그 추가 (태그가 있는 경우에만)
    if (data.tags && data.tags.length > 0) {
      const tagData = data.tags.map(tag => ({
        post_id: postId,
        tag: tag.trim()
      }));
      
      const { error: insertTagsError } = await supabase
        .from('post_tags')
        .insert(tagData);
      
      if (insertTagsError) throw insertTagsError;
    }
    
    // 4. 업데이트된 게시글 정보 반환
    return updatedPost as Post;
  } catch (error) {
    console.error('게시글 수정 실패:', error);
    throw error;
  }
}