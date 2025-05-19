'use client';

import { useToast } from '@/components/common/Toast/Context';
import BookSearch from '@/components/study/BookSearch';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useAtomValue } from 'jotai';
import { Book, Search, Upload } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

interface BookItem {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  cover: string;
  description: string;
}

export default function RecommendBookPage() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  // 검색된 도서 선택 처리
  const handleBookSelect = (book: BookItem) => {
    setTitle(book.title);
    setAuthor(book.author);
    setDescription(book.description || '');
    setIsbn(book.isbn);
    setPublisher(book.publisher);
    setPublicationDate(book.pubDate);
    setCoverUrl(book.cover);
    setCoverPreview(book.cover);
    setIsSearchMode(false);

    showToast('도서 정보가 자동으로 입력되었습니다.', 'success');
  };

  // 이미지 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 타입 체크
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.', 'error');
      return;
    }

    // 5MB 이하 체크
    if (file.size > 5 * 1024 * 1024) {
      showToast('5MB 이하의 이미지만 업로드 가능합니다.', 'error');
      return;
    }

    setCoverImage(file);
    setCoverUrl(null); // 외부 URL 초기화

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      router.push('/?login=true');
      return;
    }

    if (!title || !author) {
      showToast('제목과 저자는 필수입니다.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 1. 이미지 업로드 (있는 경우)
      let finalCoverUrl = coverUrl; // 기본적으로 검색된 커버 URL 사용

      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `book-covers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('books')
          .upload(filePath, coverImage);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('books')
          .getPublicUrl(filePath);

        finalCoverUrl = publicUrl.publicUrl;
      }

      // 2. 도서 정보 저장
      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          title,
          author,
          description,
          isbn: isbn || '',
          publisher: publisher || '',
          publication_date: publicationDate || '',
          cover_url: finalCoverUrl,
          rating: 0,
          recommendation_count: 1, // 최초 추천은 작성자
          created_by: user.id,
        })
        .select()
        .single();

      if (bookError) throw bookError;

      // 3. 추천 테이블에 추가
      await supabase.from('book_recommendations').insert({
        user_id: user.id,
        book_id: book.id,
        created_at: new Date().toISOString(),
      });

      showToast('도서 추천이 완료되었습니다.', 'success');
      router.push(`/study/book/${book.id}`);
    } catch (error) {
      console.error('도서 추천 실패:', error);
      showToast('도서 추천에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-2xl justify-between">
        <h1 className="text-2xl font-bold">도서추천</h1>
      </div>

      {isSearchMode ? (
        // 도서 검색 모드
        <div className="mx-auto max-w-2xl">
          <BookSearch onSelect={handleBookSelect} />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setIsSearchMode(false)}
              className="rounded-lg border border-gray-300 px-6 py-2 hover:bg-gray-50"
            >
              직접 입력하기
            </button>
          </div>
        </div>
      ) : (
        // 직접 입력 모드
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl space-y-6 rounded-lg border border-gold-start bg-light p-6 shadow-sm"
        >
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setIsSearchMode(true)}
              className="flex items-center gap-1 text-lg text-black hover:underline"
            >
              <Search />
              <span>도서 검색</span>
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="title" className="mb-1 block font-medium">
                도서 제목 <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="도서 제목을 입력해주세요."
                className="w-full rounded-lg border-2 border-gray-300 p-2 focus:border-2 focus:border-gold-start focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="author" className="mb-1 block font-medium">
                저자 <span className="text-red-500">*</span>
              </label>
              <input
                id="author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="저자명을 입력해주세요."
                className="w-full rounded-lg border-2 border-gray-300 p-2 focus:border-2 focus:border-gold-start focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="isbn" className="mb-1 block font-medium">
                ISBN
              </label>
              <input
                id="isbn"
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="ISBN을 입력해주세요."
                className="w-full rounded-lg border-2 border-gray-300 p-2 focus:border-2 focus:border-gold-start focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="publisher" className="mb-1 block font-medium">
                출판사
              </label>
              <input
                id="publisher"
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="출판사를 입력해주세요."
                className="w-full rounded-lg border-2 border-gray-300 p-2 focus:border-2 focus:border-gold-start focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block font-medium">
              설명
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="도서에 대한 간략한 설명을 적어주세요."
              rows={4}
              className="h-[200px] w-full rounded-lg border-2 border-gray-300 p-2 focus:border-2 focus:border-gold-start focus:outline-none"
            ></textarea>
          </div>

          <div>
            <label className="mb-1 block font-medium">표지 이미지</label>
            <div className="flex items-start gap-4">
              {coverPreview ? (
                <div className="relative h-48 w-32 overflow-hidden rounded-lg border">
                  <Image
                    src={coverPreview}
                    alt="표지 미리보기"
                    width={32}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage(null);
                      setCoverUrl(null);
                      setCoverPreview(null);
                    }}
                    className="absolute right-1 top-1 rounded-full bg-white p-1 shadow"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex h-48 w-32 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white">
                  <Book className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-center text-xs text-gray-500">
                    표지 이미지를
                    <br />
                    업로드 해주세요
                  </p>
                </div>
              )}

              <div className="flex-1">
                <label
                  htmlFor="cover-upload"
                  className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-gold-start px-4 py-2 text-sm hover:border-gold-start hover:bg-white"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  이미지 선택
                </label>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <p className="mt-2 text-xs text-gray-500">
                  * 5MB 이하의 JPG, PNG 파일만 업로드 가능합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-6 py-2 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-6 py-2 text-white transition hover:bg-gradient-to-l disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
