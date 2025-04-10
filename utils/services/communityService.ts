import { User } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';
// 게시글 타입 정의
export interface Post {
  id: number;
  title: string;
  content?: string;
  category: string;
  created_at: string;
  updated_at?: string;
  tags: string[];
  views: number;
  likes_count: number;
  comments_count: number;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  is_bookmarked?: boolean;
  is_liked?: boolean;
}

export interface BookmarkedPost {
  id: number;
  title: string;
  content?: string;
  category: string;
  created_at: string;
  updated_at?: string;
  tags: string[];
  views: number;
  likes_count: number;
  comments_count: number;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  is_bookmarked: boolean;
  is_liked: boolean;
  bookmark_created_at: string;
}

export interface Profile {
  id: string;
  name?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
}

// 댓글 타입 정의
export interface Comment {
  id: number;
  post_id: number;
  author_id: string;
  content: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  // 조회 결과에 추가되는 필드
  author_name?: string;
  author_avatar?: string;
  likes_count?: number;
  is_liked?: boolean;
  replies?: Comment[];
}

// 필터 옵션 타입 정의
export interface FilterOptions {
  category?: string;
  period?: 'all' | 'day' | 'week' | 'month' | 'year';
  sort?: 'recent' | 'likes';
  tag?: string;
}

// 게시글 목록 조회
export async function fetchPosts(options: FilterOptions = {}): Promise<Post[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  try {
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

    console.log('Executing posts query');
    const { data, error } = await query;

    if (error) {
      console.error('게시글 조회 실패:', error);
      throw error;
    }
    
    if (!data || data.length === 0) return [];

    console.log(`Found ${data.length} posts`);
    
    // 2. 각 게시글에 대한 추가 정보를 별도 쿼리로 가져오기
    const enhancedPosts = await Promise.all(data.map(async (post) => {
      try {
        // 태그 조회
        const { data: tagsData } = await supabase
          .from('post_tags')
          .select('tag')
          .eq('post_id', post.id);
        
        const tags = tagsData?.map(item => item.tag) || [];
        
        // 좋아요 수 조회
        const { count: likesCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        // 댓글 수 조회
        const { count: commentsCount } = await supabase
          .from('post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        // 작성자 정보 조회
        let authorName = '익명';
        let avatarUrl = null;
        
        if (post.author_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, nickname, avatar_url')
            .eq('id', post.author_id)
            .single();

          if (profileData) {
            authorName = profileData.nickname || profileData.name || '익명';
            
            if (profileData.avatar_url) {
              const { data: { publicUrl } } = supabase
                .storage
                .from('avatars')
                .getPublicUrl(profileData.avatar_url);
              avatarUrl = publicUrl;
            }
          }
        }
        
        // 현재 사용자의 좋아요 여부 확인
        let isLiked = false;
        if (user && post.id) {
          const { data: likeData } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();
          isLiked = !!likeData;
        }
        
        return {
          ...post,
          tags,
          author_name: authorName,
          author_avatar: avatarUrl,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: isLiked
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

  const searchTerm = query.trim().toLowerCase();
  const posts = await fetchPosts(options);

  return posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm) || 
    (post.content?.toLowerCase().includes(searchTerm) ?? false) ||
    post.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}

// 게시글 상세 조회
export async function fetchPostById(postId: number): Promise<Post | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // 조회수 증가 (에러가 발생해도 계속 진행)
    try {
      await supabase.rpc('increment_post_view', { post_id: postId });
    } catch (viewError) {
      console.error('조회수 증가 실패:', viewError);
      // 계속 진행 (조회수 증가 실패해도 게시글은 보여줘야 함)
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
    let authorName = '익명';
    let avatarUrl = null;
    
    if (data.author_id) {
      const { data: authorData } = await supabase
        .from('profiles')
        .select('name, nickname, avatar_url')
        .eq('id', data.author_id)
        .single();

      if (authorData) {
        authorName = authorData.nickname || authorData.name || '익명';
        
        if (authorData.avatar_url) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(authorData.avatar_url);
          avatarUrl = publicUrl;
        }
      }
    }
    
    // 3. 좋아요 개수 조회
    const { count: likesCount } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    // 4. 댓글 개수 조회
    const { count: commentsCount } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    // 5. 현재 사용자의 좋아요 여부 확인
    let isLiked = false;
    if (user) {
      const { data: likeData } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      isLiked = !!likeData;
    }
    
    return {
      ...data,
      tags,
      author_name: authorName,
      author_avatar: avatarUrl,
      likes_count: likesCount || 0,
      comments_count: commentsCount || 0,
      is_liked: isLiked
    };
    
  } catch (error) {
    console.error('게시글 상세 조회 중 오류 발생:', error);
    return null;
  }
}

// 게시글 작성
export async function createPost(post: {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}, user: User): Promise<number> {
  const supabase = createClient();

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
}

// 게시글 좋아요 토글
export async function togglePostLike(postId: number, userId: string): Promise<boolean> {
  const supabase = createClient();

  // 좋아요 여부 확인
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingLike) {
    // 좋아요 취소
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
    // 좋아요 추가
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: userId
      });

    if (error) throw error;
    return true;
  }
}

// 댓글 조회
export async function fetchCommentsByPostId(postId: number): Promise<Comment[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  try {
    // 1. 최상위 댓글 조회 (parent_id가 null인 댓글만)
    const { data: commentsData, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('댓글 조회 실패:', error);
      return [];
    }
    
    if (!commentsData || commentsData.length === 0) return [];
    
    // 2. 각 댓글에 대한 상세 정보 추가
    const comments = await Promise.all(commentsData.map(async (comment) => {
      try {
        // 작성자 정보 조회
        let authorName = '익명';
        let avatarUrl = null;
        
        if (comment.author_id) {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('name, nickname, avatar_url')
            .eq('id', comment.author_id)
            .single();
            
          if (authorData) {
            authorName = authorData.nickname || authorData.name || '익명';
            
            if (authorData.avatar_url) {
              const { data: { publicUrl } } = supabase
                .storage
                .from('avatars')
                .getPublicUrl(authorData.avatar_url);
              avatarUrl = publicUrl;
            }
          }
        }
        
        // 좋아요 개수 조회
        const { count: likesCount } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id);
        
        // 사용자 좋아요 여부 조회
        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', user.id)
            .maybeSingle();
          isLiked = !!likeData;
        }
        
        // 대댓글 조회
        const { data: repliesData } = await supabase
          .from('post_comments')
          .select('*')
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true });
        
        // 대댓글 처리
        const replies = await Promise.all((repliesData || []).map(async (reply) => {
          // 대댓글 작성자 정보
          let replyAuthorName = '익명';
          let replyAvatarUrl = null;
          
          if (reply.author_id) {
            const { data: replyAuthorData } = await supabase
              .from('profiles')
              .select('name, nickname, avatar_url')
              .eq('id', reply.author_id)
              .single();
              
            if (replyAuthorData) {
              replyAuthorName = replyAuthorData.nickname || replyAuthorData.name || '익명';
              
              if (replyAuthorData.avatar_url) {
                const { data: { publicUrl } } = supabase
                  .storage
                  .from('avatars')
                  .getPublicUrl(replyAuthorData.avatar_url);
                replyAvatarUrl = publicUrl;
              }
            }
          }
          
          // 대댓글 좋아요 개수
          const { count: replyLikesCount } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', reply.id);
          
          // 대댓글 사용자 좋아요 여부
          let replyIsLiked = false;
          if (user) {
            const { data: replyLikeData } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', reply.id)
              .eq('user_id', user.id)
              .maybeSingle();
            replyIsLiked = !!replyLikeData;
          }
          
          return {
            ...reply,
            author_name: replyAuthorName,
            author_avatar: replyAvatarUrl,
            likes_count: replyLikesCount || 0,
            is_liked: replyIsLiked
          };
        }));
        
        return {
          ...comment,
          author_name: authorName,
          author_avatar: avatarUrl,
          likes_count: likesCount || 0,
          is_liked: isLiked,
          replies
        };
      } catch (error) {
        console.error(`댓글 ${comment.id} 처리 중 오류:`, error);
        // 기본 정보만 반환
        return {
          ...comment,
          author_name: '익명',
          author_avatar: null,
          likes_count: 0,
          is_liked: false,
          replies: []
        };
      }
    }));
    
    return comments;
  } catch (error) {
    console.error('댓글 목록 조회 중 오류 발생:', error);
    return [];
  }
}

// 댓글 작성
export async function createComment(
  postId: number,
  content: string,
  parentId: number | null = null
): Promise<Comment> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('로그인이 필요합니다');

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      content: content,
      parent_id: parentId
    })
    .select(`
      *,
      profiles:profiles!author_id(name, nickname, avatar_url)
    `)
    .single();

  if (error) throw error;

  // 작성자 정보
  const profile = data.profiles;
  const authorName = profile?.nickname || profile?.name || '익명';

  // 아바타 URL
  let avatarUrl = null;
  if (profile?.avatar_url) {
    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
      console.log('생성된 아바타 URL:', data.publicUrl);
      avatarUrl = data.publicUrl;
    } catch (err) {
      console.error('아바타 URL 생성 오류:', err, profile.avatar_url);
    }
  }

  return {
    ...data,
    author_name: authorName,
    author_avatar: avatarUrl,
    likes_count: 0,
    is_liked: false
  };
}

// 댓글 좋아요 토글
export async function toggleCommentLike(commentId: number, userId: string): Promise<boolean> {
  const supabase = createClient();

  // 좋아요 여부 확인
  const { data: existingLike } = await supabase
    .from('comment_likes')
    .select()
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingLike) {
    // 좋아요 취소
    const { error} = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
    // 좋아요 추가
    const { error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: userId
      });

    if (error) throw error;
    return true;
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

  // 현재 게시글의 태그 조회
  const { data: tagData } = await supabase
    .from('post_tags')
    .select('tag')
    .eq('post_id', postId);

  if (!tagData || tagData.length === 0) return [];

  const tags = tagData.map(t => t.tag);

  // 태그로 관련 게시글 조회
  const { data, error } = await supabase.rpc(
    'find_related_posts',
    { current_post_id: postId, related_tags: tags, posts_limit: limit }
  );

  if (error) throw error;

  if (!data || data.length === 0) return [];

  // 게시글 상세 정보 조회
  const postIds = data.map((p: { id: number }) => p.id);
  return await Promise.all(
    postIds.map(async (id: number) => {
      const post = await fetchPostById(id);
      return post as Post;
    })
  );
}

// 북마크 토글 기능
export async function togglePostBookmark(postId: number): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('로그인이 필요합니다');

  try {
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

// 북마크 상태 확인
export async function isPostBookmarked(postId: number): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  try {
    const { data } = await supabase
      .from('post_bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    return !!data; // 북마크가 있으면 true, 없으면 false
  } catch (error) {
    console.error('북마크 상태 확인 실패:', error);
    return false;
  }
}

// 북마크한 게시글 목록 조회
export async function fetchBookmarkedPosts(page: number = 1, limit: number = 10): Promise<BookmarkedPost[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('로그인이 필요합니다.');

    // 페이지네이션을 위한 범위 계산
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 북마크 게시글 조회
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('post_bookmarks')
      .select(`
        id,
        post_id,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (bookmarksError) throw bookmarksError;
    if (!bookmarks || bookmarks.length === 0) return [];

    // 북마크된 게시글 ID 추출
    const postIds = bookmarks.map(bookmark => bookmark.post_id);

    // 게시글 상세 정보 가져오기
    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        category,
        created_at,
        updated_at,
        views,
        author_id
      `)
      .in('id', postIds);

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) return [];

    // 태그 정보를 별도로 조회 (post_tags 테이블 사용)
    const tagsPromises = postIds.map(async (postId) => {
      const { data: tagData } = await supabase
        .from('post_tags')
        .select('tag')
        .eq('post_id', postId);
      
      return { postId, tags: tagData?.map(t => t.tag) || [] };
    });
    
    const tagsResults = await Promise.all(tagsPromises);
    const tagsMap = new Map(tagsResults.map(item => [item.postId, item.tags]));

    // 프로필 정보를 별도 쿼리로 가져오기
    const authorIds = posts.map(post => post.author_id).filter(Boolean);
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, nickname, avatar_url')
      .in('id', authorIds);
      
    // 프로필 정보를 맵으로 변환
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile);
      });
    }

    // 각 게시글의 좋아요 수 가져오기
    const likesCountPromises = postIds.map(async (postId) => {
      const { count, error } = await supabase
        .from('post_likes')
        .select('id', { count: 'exact' })
        .eq('post_id', postId);

      if (error) throw error;
      return { postId, count };
    });

    // 각 게시글의 댓글 수 가져오기
    const commentsCountPromises = postIds.map(async (postId) => {
      const { count, error } = await supabase
        .from('post_comments')
        .select('id', { count: 'exact'})
        .eq('post_id', postId);
      
      if (error) throw error;
      return { postId, count };
    });

    // 사용자가 좋아요한 게시글 ID 가져오기
    const { data: likedPosts, error: likedError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    if (likedError) throw likedError;
    const likedPostIds = likedPosts ? likedPosts.map(liked => liked.post_id) : [];

    // 모든 비동기 작업 완료 대기
    const [likesResults, commentsResults] = await Promise.all([
      Promise.all(likesCountPromises),
      Promise.all(commentsCountPromises)
    ]);

    // 좋아요 수와 댓글 수를 맵으로 변환
    const likesCountMap = new Map(likesResults.map(item => [item.postId, item.count || 0]));
    const commentsCountMap = new Map(commentsResults.map(item => [item.postId, item.count || 0]));

    // 결과 배열을 위한 준비
    const result: BookmarkedPost[] = [];

    // 각 포스트를 순회하며 BookmarkedPost 객체 생성
    posts.forEach(post => {
      const bookmark = bookmarks.find(b => b.post_id === post.id);
      const profile = post.author_id ? profileMap.get(post.author_id) : null;
      
      // 여기를 수정: 아바타 URL 올바르게 처리
      let authorAvatar = null;
      if (profile?.avatar_url) {
        try {
          // Supabase Storage에서 공개 URL 생성
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(profile.avatar_url);
          
          authorAvatar = data.publicUrl;
          console.log('생성된 아바타 URL:', authorAvatar);
        } catch (err) {
          console.error('아바타 URL 생성 오류:', err);
        }
      }
      
      // BookmarkedPost 객체 생성 및 배열에 추가
      result.push({
        id: post.id,
        title: post.title,
        content: post.content || "",  // null/undefined를 빈 문자열로 처리
        category: post.category,
        created_at: post.created_at,
        updated_at: post.updated_at || post.created_at,  // null/undefined를 created_at으로 처리
        tags: tagsMap.get(post.id) || [],
        views: post.views || 0,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        author_id: post.author_id,
        author_name: profile?.nickname || profile?.name || '익명',
        author_avatar: authorAvatar, // 올바르게 생성된 URL 사용
        is_bookmarked: true,
        is_liked: likedPostIds.includes(post.id),
        bookmark_created_at: bookmark?.created_at || post.created_at
      });
    });

    // 북마크 생성 시간 기준으로 정렬
    return result.sort((a, b) => {
      const dateA = new Date(a.bookmark_created_at);
      const dateB = new Date(b.bookmark_created_at);
      return dateB.getTime() - dateA.getTime();
    });
    
  } catch (error) {
    console.error('북마크 게시글 조회 실패:', error);
    throw error;
  }
}