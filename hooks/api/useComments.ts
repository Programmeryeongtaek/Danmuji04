'use client';

import { Comment } from '@/app/types/community/communityType';
import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import {   
  createComment as createCommentService,
  deleteComment as deleteCommentService,
  fetchCommentsByPostId,
  updateComment as updateCommentService 
} from '@/utils/services/community/commentService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

// 쿼리 키 정의
export const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  list: (postId: number) => [...commentKeys.lists(), postId] as const,
};

// 댓글 목록 조회
export const useComments = (postId: number) => {
  return useQuery({
    queryKey: commentKeys.list(postId),
    queryFn: () => fetchCommentsByPostId(postId),
    enabled: !!postId,
    staleTime: 0, // 항상 최신 데이터를 가져오도록 설정
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

// 댓글 작성
export const useCreateComment = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      postId, 
      content, 
      parentId = null 
    }: { 
      postId: number; 
      content: string; 
      parentId?: number | null;
    }): Promise<Comment> => {
      if (!user) throw new Error('로그인이 필요합니다.');
      return createCommentService(postId, content, parentId);
    },
    onSuccess: (newComment, { postId, parentId }) => {
      // 서버에서 받은 실제 데이터로 업데이트
      const previousComments = queryClient.getQueryData<Comment[]>(commentKeys.list(postId));

      if (previousComments) {
        let updatedComments: Comment[];

        if (parentId) {
          // 답글인 경우
          updatedComments = previousComments.map(comment => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment]
              };
            }
            return comment;
          });
        } else {
          // 일반 댓글인 경우
          updatedComments = [...previousComments, newComment];
        }

        queryClient.setQueryData(commentKeys.list(postId), updatedComments);
      }

      // 더 안전하게 전체 댓글 목록을 다시 불러오기
      queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });

      showToast(
        parentId ? '답글이 등록되었습니다.' : '댓글이 등록되었습니다.',
        'success'
      );
    },
    onError: (error) => {
      console.error('댓글 작성 실패:', error);
      if (error instanceof Error && error.message === '로그인이 필요합니다.') {
        showToast('로그인이 필요합니다.', 'error');
      } else {
        showToast('댓글 작성에 실패했습니다.', 'error');
      }
    },
  });
};

// 댓글 수정
export const useUpdateComment = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: number;
      content: string;
    }): Promise<Comment> => {
      if (!user) throw new Error('로그인이 필요합니다.');
      return updateCommentService(commentId, content);
    },
    onMutate: async ({ commentId, content }) => {
      // 모든 댓글 목록 쿼리 취소 (어떤 postId인지 모르므로)
      await queryClient.cancelQueries({ queryKey: commentKeys.lists() });

      // 모든 댓글 목록에서 해당 댓글 찾아서 업데이트
      const queryCache = queryClient.getQueryCache();
      const previousData: Record<string, Comment[]> = {};

      queryCache.getAll().forEach(query => {
        if (query.queryKey[0] === 'comments' && query.queryKey[1] === 'list') {
          const postId = query.queryKey[2] as number;
          const comments = query.state.data as Comment[] | undefined;
          
          if (comments) {
            previousData[postId.toString()] = comments;
            
            // 낙관적 업데이트
            const updatedComments = comments.map(comment => {
              // 메인 댓글 수정
              if (comment.id === commentId) {
                return {
                  ...comment,
                  content,
                  updated_at: new Date().toISOString(),
                };
              }

              // 답글 수정
              if (comment.replies) {
                return {
                  ...comment,
                  replies: comment.replies.map(reply =>
                    reply.id === commentId
                      ? {
                          ...reply,
                          content,
                          updated_at: new Date().toISOString(),
                        }
                      : reply
                  ),
                };
              }

              return comment;
            });

            queryClient.setQueryData(commentKeys.list(postId), updatedComments);
          }
        }
      });

      return { previousData };
    },
    onError: (error, variables, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([postId, comments]) => {
          queryClient.setQueryData(commentKeys.list(Number(postId)), comments);
        });
      }

      // 에러 메시지에 따른 토스트 분기 처리
      if (error instanceof Error) {
        if (error.message === '로그인이 필요합니다.') {
          showToast('로그인이 필요합니다.', 'error');
        } else if (error.message === '작성 후 24시간이 지난 댓글은 수정할 수 없습니다.') {
          showToast('작성 후 24시간이 지난 댓글은 수정할 수 없습니다.', 'error');
        } else if (error.message.includes('24시간')) {
          showToast('작성 후 24시간이 지난 댓글은 수정할 수 없습니다.', 'error');
        } else {
          showToast('댓글 수정에 실패했습니다.', 'error');
        }
      } else {
        showToast('댓글 수정에 실패했습니다.', 'error');
      }
    },
    onSuccess: (updatedComment) => {
      // 서버에서 받은 실제 데이터로 최종 업데이트
      const queryCache = queryClient.getQueryCache();
      
      queryCache.getAll().forEach(query => {
        if (query.queryKey[0] === 'comments' && query.queryKey[1] === 'list') {
          const postId = query.queryKey[2] as number;
          const comments = query.state.data as Comment[] | undefined;
          
          if (comments) {
            const hasComment = comments.some(comment => 
              comment.id === updatedComment.id || 
              comment.replies?.some(reply => reply.id === updatedComment.id)
            );
            
            if (hasComment) {
              const updatedComments = comments.map(comment => {
                // 메인 댓글 수정
                if (comment.id === updatedComment.id) {
                  return updatedComment;
                }

                // 답글 수정
                if (comment.replies) {
                  return {
                    ...comment,
                    replies: comment.replies.map(reply => 
                      reply.id === updatedComment.id ? updatedComment : reply
                    ),
                  };
                }

                return comment;
              });

              queryClient.setQueryData(commentKeys.list(postId), updatedComments);
            }
          }
        }
      });

      showToast('댓글이 수정되었습니다.', 'success');
    },
  });
};

// 댓글 삭제
export const useDeleteComment = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      commentId,
    }: { 
      commentId: number;
    }): Promise<boolean> => {
      if (!user) throw new Error('로그인이 필요합니다.');
      return deleteCommentService(commentId);
    },
    onMutate: async ({ commentId }) => {
      // 모든 댓글 목록 쿼리 취소
      await queryClient.cancelQueries({ queryKey: commentKeys.lists() });

      // 모든 댓글 목록에서 해당 댓글 찾아서 삭제
      const queryCache = queryClient.getQueryCache();
      const previousData: Record<string, Comment[]> = {};

      queryCache.getAll().forEach(query => {
        if (query.queryKey[0] === 'comments' && query.queryKey[1] === 'list') {
          const postId = query.queryKey[2] as number;
          const comments = query.state.data as Comment[] | undefined;
          
          if (comments) {
            previousData[postId.toString()] = comments;
            
            // 낙관적 업데이트 (댓글 삭제)
            const updatedComments = comments
              .filter(comment => comment.id !== commentId) // 메인 댓글 삭제
              .map(comment => ({
                ...comment,
                replies: comment.replies?.filter(reply => reply.id !== commentId) || [], // 답글 삭제
              }));

            queryClient.setQueryData(commentKeys.list(postId), updatedComments);
          }
        }
      });

      return { previousData };
    },
    onError: (error, variables, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([postId, comments]) => {
          queryClient.setQueryData(commentKeys.list(Number(postId)), comments);
        });
      }
      
      if (error instanceof Error && error.message === '로그인이 필요합니다.') {
        showToast('로그인이 필요합니다.', 'error');
      } else {
        showToast('댓글 삭제에 실패했습니다.', 'error');
      }
    },
    onSuccess: (success, { commentId }) => {
      if (success) {
        // 댓글 좋아요 관련 캐시도 정리
        queryClient.removeQueries({ queryKey: ['comment-like-status', commentId] });
        
        // 배치 쿼리에서도 해당 댓글 제거
        queryClient.invalidateQueries({
          predicate: (query) => 
            query.queryKey[0] === 'comments-like-status' &&
            Array.isArray(query.queryKey[1]) &&
            query.queryKey[1].includes(commentId)
        });

        showToast('댓글이 삭제되었습니다.', 'success');
      }
    },
  });
};

// 댓글 삭제 전 검증 훅 (답글이 있는 댓글 확인)
export const useValidateCommentDeletion = () => {
  const { showToast } = useToast();

  return (comment: Comment, isReply: boolean = false): boolean => {
    if (isReply) {
      return window.confirm('정말로 이 답글을 삭제하시겠습니까?');
    } else {
      if (comment.replies && comment.replies.length > 0) {
        showToast('답글이 있는 댓글은 삭제할 수 없습니다.', 'error');
        return false;
      }
      return window.confirm('정말로 이 댓글을 삭제하시겠습니까?');
    }
  };
};