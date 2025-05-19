'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import {
  fetchPostById,
  updatePost,
} from '@/utils/services/community/postService';
import { useAtomValue } from 'jotai';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // 게시글 ID
  const postId = params.id ? parseInt(params.id as string) : 0;

  // 게시글 로드
  useEffect(() => {
    const loadPost = async () => {
      try {
        setIsLoading(true);
        const post = await fetchPostById(postId);

        if (!post) {
          showToast('게시글을 찾을 수 없습니다.', 'error');
          router.push('/community');
          return;
        }

        // 작성자 확인
        if (!user || post.author_id !== user.id) {
          showToast('게시글 수정 권한이 없습니다.', 'error');
          router.push(`/community/post/${postId}`);
          return;
        }

        // 폼 데이터 설정
        setTitle(post.title);
        setContent(post.content || '');
        setCategory(post.category);
        setTags(post.tags || []);
      } catch (error) {
        console.error('게시글 로드 실패:', error);
        showToast('게시글을 불러오는데 실패했습니다.', 'error');
        router.push('/community');
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      loadPost();
    }
  }, [postId, router, showToast, user]);

  // 태그 추가
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // 태그 삭제
  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('제목을 입력해주세요.', 'error');
      return;
    }

    if (!content.trim()) {
      showToast('내용을 입력해주세요.', 'error');
      return;
    }

    try {
      setIsLoading(true);

      // 게시글 수정 API 호출
      await updatePost(postId, {
        title,
        content,
        category,
        tags,
      });

      showToast('게시글이 성공적으로 수정되었습니다.', 'success');
      router.push(`/community/post/${postId}`);
    } catch (error) {
      console.error('게시글 수정 실패:', error);
      showToast('게시글 수정에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 카테고리 목록 (커뮤니티 페이지와 일치시켜야 함)
  const categories = [
    { id: 'notice', label: '공지사항' },
    { id: 'chats', label: '자유게시판' },
    { id: 'faq', label: '질문 게시판' },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gold-start border-b-transparent"></div>
        <p className="ml-2">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">게시글 수정</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 카테고리 선택 */}
        <div>
          <label className="mb-2 block font-medium">카테고리</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border p-2 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="mb-2 block font-medium">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border p-2 focus:border-gold-start focus:bg-light focus:outline-none focus:ring-1 focus:ring-gold-start"
            placeholder="제목을 입력하세요."
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="mb-2 block font-medium">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-64 w-full rounded-lg border p-2 focus:border-gold-start focus:bg-light focus:outline-none focus:ring-1 focus:ring-gold-start"
            placeholder="내용을 입력하세요."
          />
        </div>

        {/* 태그 */}
        <div>
          <label className="mb-2 block font-medium">태그</label>
          <div className="flex">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 rounded-l-lg border p-2 focus:border-gold-start focus:bg-light focus:outline-none focus:ring-1 focus:ring-gold-start"
              placeholder="태그를 입력하고 Enter 또는 추가 버튼을 누르세요."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="rounded-r-lg bg-gradient-to-r from-gold-start to-gold-end px-4 py-2 text-white"
            >
              추가
            </button>
          </div>

          {/* 태그 목록 */}
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(index)}
                  className="ml-2 text-gray-500 hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2"
          >
            취소
          </Button>
          <Button type="submit" className="px-4 py-2" disabled={isLoading}>
            {isLoading ? '처리 중...' : '수정'}
          </Button>
        </div>
      </form>
    </div>
  );
}
