'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import {
  ArrowLeft,
  Book,
  MessageSquare,
  Star,
  ThumbsUp,
  User,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

interface BookDetails {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  rating: number;
  recommendation_count: number;
  user_has_recommended?: boolean;
  created_at: string;
  created_by: string;
}

interface Comment {
  id: string;
  book_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  created_at: string;
}

interface RelatedStudy {
  id: string;
  title: string;
  status: 'recruiting' | 'in_progress' | 'completed';
  current_participants: number;
  max_participants: number;
  start_date: string;
}

export default function BookDetailPage() {
  const [book, setBook] = useState<BookDetails | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedStudies, setRelatedStudies] = useState<RelatedStudy[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const user = useAtomValue(userAtom);
  const params = useParams();
  const id = params.id as string;
  const { showToast } = useToast();

  // 도서 상세 정보 로드
  useEffect(() => {
    const fetchBookDetails = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();

        // 1. 도서 정보 가져오기
        const { data: bookData, error: bookError } = await supabase
          .from('books')
          .select('*')
          .eq('id', id)
          .single();

        if (bookError) throw bookError;

        let bookWithRecommendation = bookData;

        // 사용자의 추천 여부 확인
        if (user) {
          const { data: userRecommendation } = await supabase
            .from('book_recommendations')
            .select('id')
            .eq('user_id', user.id)
            .eq('book_id', params.id)
            .maybeSingle();

          bookWithRecommendation = {
            ...bookData,
            user_has_recommended: !!userRecommendation,
          };
        }

        setBook(bookWithRecommendation);

        // 2. 댓글 가져오기
        const { data: commentsData } = await supabase
          .from('book_comments')
          .select('*')
          .eq('book_id', id)
          .order('created_at', { ascending: false });

        // 3. 댓글 작성자 프로필 정보 가져오기
        const commentsWithProfiles = await Promise.all(
          (commentsData || []).map(async (comment) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name, nickname, avatar_url')
              .eq('id', comment.user_id)
              .single();

            let userName = '익명';
            let userAvatar = undefined;

            if (profileData) {
              userName = profileData.nickname || profileData.name || '익명';

              if (profileData.avatar_url) {
                const { data: urlData } = supabase.storage
                  .from('avatars')
                  .getPublicUrl(profileData.avatar_url);
                userAvatar = urlData.publicUrl;
              }
            }

            return {
              ...comment,
              user_name: userName,
              user_avatar: userAvatar,
            };
          })
        );

        setComments(commentsWithProfiles);

        // 4. 관련 스터디 가져오기
        const { data: studiesData } = await supabase
          .from('studies')
          .select('*')
          .eq('book_id', params.id)
          .order('created_at', { ascending: false });

        setRelatedStudies(studiesData || []);
      } catch (error) {
        console.error('도서 상세 정보 로드 실패:', error);
        showToast('정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookDetails();
  }, [params.id, user, showToast]);

  // 도서 추천 토글
  const handleRecommend = async () => {
    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
      return;
    }

    if (!book) return;

    try {
      const supabase = createClient();

      // 이미 추천했는지 확인
      const { data: existingRec, error: recError } = await supabase
        .from('book_recommendations')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', book.id)
        .maybeSingle();

      if (recError) {
        console.error('추천 확인 오류:', recError);
        throw recError;
      }

      if (existingRec) {
        // 추천 취소 로직
        const { error: deleteError } = await supabase
          .from('book_recommendations')
          .delete()
          .eq('id', existingRec.id);

        if (deleteError) throw deleteError;

        // Books 테이블 카운트 감소
        const { error: rpcError } = await supabase.rpc(
          'decrement_book_recommendation',
          {
            book_id: book.id,
          }
        );

        if (rpcError) throw rpcError;

        // UI 업데이트
        setBook({
          ...book,
          recommendation_count: Math.max(0, book.recommendation_count - 1),
          user_has_recommended: false,
        });

        showToast('도서 추천을 취소했습니다.', 'success');
      } else {
        // 추천 추가 로직
        const { error: insertError } = await supabase
          .from('book_recommendations')
          .insert({
            user_id: user.id,
            book_id: book.id,
            created_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;

        // Books 테이블 카운트 증가
        const { error: rpcError } = await supabase.rpc(
          'increment_book_recommendation',
          {
            book_id: book.id,
          }
        );

        if (rpcError) throw rpcError;

        // UI 업데이트
        setBook({
          ...book,
          recommendation_count: book.recommendation_count + 1,
          user_has_recommended: true,
        });

        showToast('도서를 추천했습니다.', 'success');
      }
    } catch (error) {
      console.error('도서 추천 처리 실패:', error);
      showToast('도서 추천 처리에 실패했습니다.', 'error');
    }
  };

  // 댓글 작성
  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
      return;
    }

    if (!newComment.trim() || !book) return;

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, nickname, avatar_url')
        .eq('id', user.id)
        .single();

      const userName = profile?.nickname || profile?.name || '익명';
      let userAvatar = undefined;

      if (profile?.avatar_url) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(profile.avatar_url);
        userAvatar = urlData.publicUrl;
      }

      // 댓글 저장
      const { data: comment, error } = await supabase
        .from('book_comments')
        .insert({
          book_id: book.id,
          user_id: user.id,
          content: newComment,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // 새 댓글 UI에 추가
      const newCommentWithProfile = {
        ...comment,
        user_name: userName,
        user_avatar: userAvatar,
      };

      setComments([newCommentWithProfile, ...comments]);
      setNewComment('');

      showToast('댓글이 등록되었습니다.', 'success');
    } catch (error) {
      console.error('댓글 등록 실패:', error);
      showToast('댓글 등록에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="mb-4 text-xl">도서를 찾을 수 없습니다.</h2>
        <Link
          href="/study?category=book"
          className="inline-flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          도서 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/study?category=book"
        className="mb-6 inline-flex items-center text-gray-600 hover:text-gold-start"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        도서 목록으로 돌아가기
      </Link>

      <div className="grid gap-8 md:grid-cols-3">
        {/* 도서 정보 */}
        <div className="md:col-span-2">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col md:flex-row md:gap-8">
              {/* 도서 표지 */}
              <div className="mb-4 flex justify-center md:mb-0 md:w-1/3">
                {book.cover_url ? (
                  <Image
                    src={book.cover_url}
                    alt={book.title}
                    width={300}
                    height={300}
                    unoptimized={true}
                    className="rounded-lg object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-[300px] w-[200px] items-center justify-center rounded-lg bg-gray-200 shadow-md">
                    <Book className="h-24 w-24 text-gray-400" />
                  </div>
                )}
              </div>

              {/* 도서 정보 */}
              <div className="flex-1">
                <h1 className="mb-2 text-2xl font-bold">{book.title}</h1>
                <p className="mb-4 text-lg text-gray-700">{book.author}</p>

                <div className="mb-4 flex items-center">
                  <div className="mr-4 flex items-center">
                    <Star className="mr-1 h-5 w-5 fill-amber-500 text-amber-500" />
                    <span className="font-medium">
                      {book.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <ThumbsUp className="mr-1 h-5 w-5 text-gray-700" />
                    <span className="font-medium">
                      {book.recommendation_count}명 추천
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRecommend}
                  className={`mb-6 flex items-center gap-2 rounded-lg px-4 py-2 font-medium ${
                    book.user_has_recommended
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-gradient-to-r from-gold-start to-gold-end text-white hover:bg-gradient-to-l'
                  }`}
                >
                  <ThumbsUp
                    className={`h-5 w-5 ${book.user_has_recommended ? '' : 'text-white'}`}
                  />
                  {book.user_has_recommended
                    ? '추천 취소하기'
                    : '이 책 추천하기'}
                </button>

                {book.description && (
                  <div>
                    <h2 className="mb-2 text-lg font-medium">책 소개</h2>
                    <p className="whitespace-pre-wrap text-gray-700">
                      {book.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 스터디 개설 버튼 */}
            <div className="mt-6 border-t pt-6">
              <Link
                href={`/study/create?book_id=${id}`}
                className="flex items-center justify-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-3 font-medium text-white transition hover:bg-gradient-to-l"
              >
                <Users className="mr-2 h-5 w-5" />이 책으로 스터디 모임 개설하기
              </Link>
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">
              한 줄 감상{' '}
              <span className="text-gray-500">({comments.length})</span>
            </h2>

            {user ? (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    {user && (
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                        {/* 사용자 아바타 표시 */}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="이 책에 대한 생각을 공유해주세요"
                      className="w-full rounded-lg border border-gray-300 p-3 focus:border-gold-start focus:outline-none"
                      rows={2}
                    ></textarea>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={!newComment.trim() || isSubmitting}
                        className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white disabled:opacity-50"
                      >
                        {isSubmitting ? '등록 중...' : '댓글 등록'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mb-6 rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-gray-600">
                  댓글을 작성하려면{' '}
                  <Link
                    href="/?login=true"
                    className="text-gold-start hover:underline"
                  >
                    로그인
                  </Link>
                  이 필요합니다.
                </p>
              </div>
            )}

            {/* 댓글 목록 */}
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                        {comment.user_avatar ? (
                          <Image
                            unoptimized={true}
                            src={comment.user_avatar}
                            alt={comment.user_name}
                            width={40}
                            height={40}
                            objectFit="cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium">{comment.user_name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <MessageSquare className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p>첫 번째 댓글을 남겨보세요!</p>
              </div>
            )}
          </div>
        </div>

        {/* 관련 스터디 */}
        <div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">관련 스터디</h2>

            {relatedStudies.length > 0 ? (
              <div className="space-y-4">
                {relatedStudies.map((study) => (
                  <Link
                    key={study.id}
                    href={`/study/${study.id}`}
                    className="block rounded-lg border bg-white p-4 transition hover:border-gold-start hover:shadow-sm"
                  >
                    <span
                      className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        study.status === 'recruiting'
                          ? 'bg-green-100 text-green-800'
                          : study.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {study.status === 'recruiting'
                        ? '모집중'
                        : study.status === 'in_progress'
                          ? '진행중'
                          : '완료'}
                    </span>

                    <h3 className="mb-2 font-medium">{study.title}</h3>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        <span>
                          {study.current_participants}/{study.max_participants}
                          명
                        </span>
                      </div>
                      <span>
                        시작일: {formatDate(study.start_date).split(' ')[0]}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-6 text-center">
                <p className="mb-4 text-gray-600">
                  이 책으로 진행 중인 스터디가 없습니다.
                </p>
                <Link
                  href={`/study/create?book_id=${book.id}`}
                  className="inline-flex items-center rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white transition hover:bg-gradient-to-l"
                >
                  <Users className="mr-2 h-4 w-4" />
                  스터디 개설하기
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
