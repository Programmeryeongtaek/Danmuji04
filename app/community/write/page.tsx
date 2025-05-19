'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import LoginModal from '@/components/home/LoginModal';
import { userAtom } from '@/store/auth';
import {
  createPost,
  fetchPopularTags,
} from '@/utils/services/community/postService';
import { isAdminUser } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import { ChevronLeft, Plus, Upload, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

// 커뮤니티 카테고리 정의
const communityCategories = [
  {
    id: 'chats',
    label: '자유게시판',
  },
  {
    id: 'faq',
    label: '질문 게시판',
  },
  {
    id: 'notice',
    label: '공지사항',
  },
];

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [popularTags, setPopularTags] = useState<
    { name: string; count: number }[]
  >([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  // 사용자 권한 확인
  useEffect(() => {
    const checkAdminStatus = async () => {
      const admin = await isAdminUser();
      setIsAdmin(admin);
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  // 인기 태그 로드
  useEffect(() => {
    const loadPopularTags = async () => {
      try {
        const tagsData = await fetchPopularTags(10);
        setPopularTags(tagsData);
      } catch (error) {
        console.error('인기 태그 로드 실패:', error);
      }
    };

    loadPopularTags();
  }, []);

  // 로그인 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      // 로그인 상태 확인 중 로딩 상태 추가
      setIsLoading(true);

      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      // 로그인 상태 확인 완료
      setIsLoading(false);

      // 로그인되지 않은 경우에만 모달 표시
      if (error || !data.user) {
        setIsLoginModalOpen(true);
      }
    };

    checkAuth();
  }, []);

  // 로그인 모달 닫기 처리
  const handleModalClose = useCallback(() => {
    setIsLoginModalOpen(false);
    if (!user) {
      router.push('/community');
    }
  }, [router, user]);

  // 권한별 카테고리
  const displayCategories = isAdmin
    ? communityCategories
    : communityCategories.filter((category) => category.id !== 'notice');

  // 태그 추가
  const addTag = () => {
    if (!newTag.trim()) return;

    // 중복 태그 방지
    if (tags.includes(newTag.trim())) {
      showToast('이미 추가된 태그입니다.', 'error');
      return;
    }

    // 태그는 최대 5개까지만 추가 가능
    if (tags.length >= 5) {
      showToast('태그는 최대 5개까지 추가할 수 있습니다.', 'error');
      return;
    }

    setTags([...tags, newTag.trim()]);
    setNewTag('');
  };

  // 태그 삭제
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // 인기 태그 추가
  const addPopularTag = (tag: string) => {
    if (tags.includes(tag)) {
      showToast('이미 추가된 태그입니다.', 'error');
      return;
    }

    if (tags.length >= 5) {
      showToast('태그는 최대 5개까지 추가할 수 있습니다.', 'error');
      return;
    }

    setTags([...tags, tag]);
  };

  // 이미지 업로드 처리
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // 최대 5개까지만 업로드 가능
    if (images.length + files.length > 5) {
      showToast('이미지는 최대 5개까지 업로드할 수 있습니다.', 'error');
      return;
    }

    const newImages: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('파일 크기는 5MB를 초과할 수 없습니다.', 'error');
        return;
      }

      // 이미지 파일만 허용
      if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드할 수 있습니다.', 'error');
        return;
      }

      newImages.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setImages([...images, ...newImages]);
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  // 이미지 삭제
  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]); // URL 해제

    const newImages = [...images];
    const newPreviews = [...imagePreviews];

    newImages.splice(index, 1);
    newPreviews.splice(index, 1);

    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  // 이미지 업로드 (실제 Storage에 업로드)
  const uploadImages = async () => {
    if (images.length === 0) return [];

    const supabase = createClient();
    const uploadedUrls: string[] = [];

    for (const image of images) {
      try {
        const fileExt = image.name.split('.').pop();
        const fileName = `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        // Storage에 이미지 업로드
        const { error: uploadError } = await supabase.storage
          .from('community')
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        // Public URL 가져오기
        const { data } = supabase.storage
          .from('community')
          .getPublicUrl(filePath);

        uploadedUrls.push(data.publicUrl);
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
        showToast('이미지 업로드에 실패했습니다.', 'error');
      }
    }

    return uploadedUrls;
  };

  // 폼 제출
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    // 필수 필드 검증
    if (!title.trim()) {
      showToast('제목을 입력해주세요.', 'error');
      return;
    }

    if (!content.trim()) {
      showToast('내용을 입력해주세요.', 'error');
      return;
    }

    if (!category) {
      showToast('카테고리를 선택해주세요.', 'error');
      return;
    }

    // 공지사항 권한 검증
    if (category === 'notice' && !isAdmin) {
      showToast('공지사항은 관리자만 작성 가능합니다.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      // 이미지 업로드
      const uploadedImageUrls = await uploadImages();

      // 이미지 URL을 본문에 추가
      let finalContent = content;
      if (uploadedImageUrls.length > 0) {
        // 줄바꿈 추가하고 각 이미지를 마크다운 형식으로 추가
        finalContent += '\n\n';
        uploadedImageUrls.forEach((url) => {
          // 이미지 URL을 마크다운 형식으로 추가
          finalContent += `![이미지](${url})\n\n`;
        });
      }

      // 게시글 생성
      const postId = await createPost({
        title,
        content: finalContent,
        category,
        tags,
      });

      showToast('게시글이 작성되었습니다.', 'success');
      router.push(`/community/post/${postId}`);
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      showToast('게시글 작성에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 이미지 URL 해제
  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  // 반환 부분 시작 부분에 로딩 체크 추가
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gold-start border-b-transparent"></div>
        <p className="ml-2">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <Link
          href="/community"
          className="flex items-center text-gray-600 hover:text-gold-start"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">게시글 작성</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 카테고리 선택 */}
        <div>
          <label className="mb-2 block text-base font-medium">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {displayCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-lg px-4 py-2 ${
                  category === cat.id
                    ? 'bg-gold-start text-white'
                    : 'border border-gray-300 hover:border-gold-start hover:bg-gray-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 입력 */}
        <div>
          <label htmlFor="title" className="mb-2 block text-base font-medium">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full rounded-lg border p-2 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
            maxLength={50}
          />
          <div className="mt-1 text-right text-xs text-gray-500">
            {title.length}/50
          </div>
        </div>

        {/* 내용 입력 */}
        <div>
          <label htmlFor="content" className="mb-2 block text-base font-medium">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            className="h-80 w-full rounded-lg border p-3 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
            maxLength={500}
          />
          <div className="mt-1 text-right text-xs text-gray-500">
            {content.length}/500
          </div>
        </div>

        {/* 태그 입력 */}
        <div>
          <label className="mb-2 block text-sm font-medium">태그</label>

          {/* 현재 태그 목록 */}
          <div className="mb-2 flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <div
                key={index}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* 태그 입력 폼 */}
          <div className="mb-2 flex">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="태그를 입력하세요"
              className="flex-1 rounded-l-lg border p-2 focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-r-lg bg-gold-start px-4 text-white"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* 인기 태그 */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-500">
              인기 태그
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => addPopularTag(tag.name)}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 이미지 업로드 */}
        <div>
          <label className="mb-2 block text-sm font-medium">이미지</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {imagePreviews.map((preview, index) => (
              <div
                key={index}
                className="relative h-24 w-24 overflow-hidden rounded-lg border"
              >
                <Image
                  src={preview}
                  alt={`preview-${index}`}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* 이미지 추가 버튼 */}
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
              >
                <Upload className="mb-1 h-6 w-6" />
                <span className="text-xs">이미지 추가</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  multiple
                  className="hidden"
                />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            최대 5MB, 5개까지 업로드 가능합니다.
          </p>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-4 pt-4">
          <Link
            href="/community"
            className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
          >
            취소
          </Link>
          <Button type="submit" disabled={isSubmitting} className="px-6 py-2">
            {isSubmitting ? '게시 중...' : '작성'}
          </Button>
        </div>
      </form>

      {/* 로그인 모달 */}
      <LoginModal isOpen={isLoginModalOpen} onClose={handleModalClose} />
    </div>
  );
}
