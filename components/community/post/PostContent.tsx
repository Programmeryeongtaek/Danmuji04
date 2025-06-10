'use client';

import Image from 'next/image';
import { memo, useMemo } from 'react';

interface PostContentProps {
  content: string | undefined;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isFirstImagePreloaded?: boolean;
}

const PostContent = memo(
  ({
    content,
    isOwner,
    onEdit,
    onDelete,
    isFirstImagePreloaded = false,
  }: PostContentProps) => {
    // 한 번만 계산하여 조건부 렌더링 결정
    const renderedContent = useMemo(() => {
      if (!content) return null;

      // 빠른 이미지 체크
      const hasImages = content.includes('![');

      // 이미지가 없으면 즉시 단순 렌더링
      if (!hasImages) {
        return (
          <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
            {content}
          </div>
        );
      }

      // 이미지가 있을 때만 복잡한 파싱 수행
      const imageLinkRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let textContent = content;
      const images: Array<{ alt: string; src: string; index: number }> = [];
      let match;
      let imageIndex = 0;

      // 이미지 정보 추출
      while ((match = imageLinkRegex.exec(content)) !== null) {
        images.push({
          alt: match[1] || '이미지',
          src: match[2],
          index: imageIndex++,
        });
      }

      // 이미지 마크다운을 플레이스홀더로 교체
      textContent = content.replace(imageLinkRegex, `__IMAGE_PLACEHOLDER_$1__`);

      const parts = textContent.split(/__IMAGE_PLACEHOLDER_([^_]*)__/);
      const result = [];
      let currentImageIndex = 0;

      for (let i = 0; i < parts.length; i++) {
        // 텍스트 파트
        if (i % 2 === 0 && parts[i]) {
          result.push(
            <p
              key={`text-${i}`}
              className="mb-4 whitespace-pre-wrap leading-relaxed text-gray-800"
            >
              {parts[i]}
            </p>
          );
        }
        // 이미지 파트
        else if (i % 2 === 1 && images[currentImageIndex]) {
          const image = images[currentImageIndex];
          const isFirstImage = currentImageIndex === 0;

          result.push(
            <div
              key={`image-${currentImageIndex}`}
              className="my-6 w-full overflow-hidden rounded-lg"
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={800}
                height={600}
                className="h-auto w-full object-contain"
                priority={isFirstImage && !isFirstImagePreloaded}
                loading={isFirstImage ? 'eager' : 'lazy'}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                }}
                {...(!isFirstImagePreloaded &&
                  isFirstImage && { fetchPriority: 'high' as const })}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          );
          currentImageIndex++;
        }
      }

      return <div className="prose prose-lg max-w-none">{result}</div>;
    }, [content, isFirstImagePreloaded]);

    return (
      <article className="relative mb-8 bg-white">
        {/* 수정/삭제 버튼 */}
        {isOwner && (
          <div className="absolute -top-5 right-0 z-10 flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
            >
              수정
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600"
            >
              삭제
            </button>
          </div>
        )}

        {/* 최적화된 단일 렌더링 */}
        {renderedContent}
      </article>
    );
  }
);

PostContent.displayName = 'PostContent';

export default PostContent;
