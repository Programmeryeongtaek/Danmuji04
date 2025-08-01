'use client';

import { BookmarkedPost } from '@/app/types/community/communityType';
import {
  CheckSquare,
  Edit,
  Eye,
  MessageSquare,
  Square,
  Star,
  ThumbsUp,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { MouseEvent, useRef, useState } from 'react';

interface BookmarkItemProps {
  post: BookmarkedPost;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (postId: number, e: MouseEvent<HTMLButtonElement>) => void;
  onImportanceChange: (
    postId: number,
    importance: number,
    e: MouseEvent<HTMLButtonElement>
  ) => void;
  onMemoSave: (postId: number, memo: string) => void;
  formatDate: (dateString: string) => string;
  getCategoryName: (categoryId: string) => string;
  importanceOptions: Array<{ value: number; label: string; color: string }>;
}

export default function BookmarkItem({
  post,
  selectionMode,
  isSelected,
  onToggleSelection,
  onImportanceChange,
  onMemoSave,
  formatDate,
  getCategoryName,
  importanceOptions,
}: BookmarkItemProps) {
  const [openImportanceDropdown, setOpenImportanceDropdown] = useState(false);
  const [editingMemo, setEditingMemo] = useState<{
    postId: number;
    memo: string;
  } | null>(null);
  const memoInputRef = useRef<HTMLTextAreaElement>(null);

  const toggleImportanceDropdown = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenImportanceDropdown(!openImportanceDropdown);
  };

  const startEditingMemo = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingMemo({ postId: post.id, memo: post.memo || '' });

    setTimeout(() => {
      if (memoInputRef.current) {
        memoInputRef.current.focus();
      }
    }, 0);
  };

  const saveMemo = async () => {
    if (!editingMemo) return;
    await onMemoSave(editingMemo.postId, editingMemo.memo);
    setEditingMemo(null);
  };

  const cancelEditingMemo = () => {
    setEditingMemo(null);
  };

  return (
    <div
      className={`relative block rounded-lg border p-4 ${
        selectionMode && isSelected
          ? 'border-gold-start bg-gold-start/5'
          : 'hover:border-gold-start hover:bg-gray-50'
      }`}
    >
      {/* 중요도 표시 */}
      {post.importance > 0 && (
        <div
          className="absolute left-0 top-0 h-full w-1.5 rounded-l-lg"
          style={{
            backgroundColor: importanceOptions[post.importance].color,
          }}
        />
      )}

      <div className="relative">
        {/* 선택 체크박스 */}
        {selectionMode && (
          <div className="mb-2 flex justify-end">
            <button
              onClick={(e) => onToggleSelection(post.id, e)}
              className="rounded p-1 hover:bg-gray-100"
            >
              {isSelected ? (
                <CheckSquare className="h-5 w-5 text-gold-start" />
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        )}

        {/* 북마크 메인 컨텐츠 */}
        <Link
          href={selectionMode ? '#' : `/community/post/${post.id}`}
          className="block"
          onClick={selectionMode ? (e) => e.preventDefault() : undefined}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  post.category === 'notice'
                    ? 'bg-red-100 text-red-800'
                    : post.category === 'faq'
                      ? 'bg-blue-100 text-blue-800'
                      : post.category === 'study'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                }`}
              >
                {getCategoryName(post.category)}
              </span>

              {post.tags && post.tags.length > 0 && (
                <div className="hidden flex-wrap gap-1 sm:flex">
                  {post.tags.map((tag, idx) => (
                    <span
                      key={`tag-${post.id}-${idx}`}
                      className="rounded bg-gray-100 px-1.5 text-xs text-gray-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 북마크 아이콘 및 중요도 표시 */}
            <div className="flex items-center gap-2">
              {!selectionMode && (
                <div className="relative">
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
                    onClick={toggleImportanceDropdown}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        post.importance > 0
                          ? 'fill-yellow-400 text-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>

                  {/* 중요도 선택 드롭다운 */}
                  {openImportanceDropdown && (
                    <div className="absolute right-0 top-full z-20 w-40 flex-col rounded-lg border bg-white p-2 shadow-lg">
                      {importanceOptions.map((option) => (
                        <button
                          key={option.value}
                          className="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100"
                          onClick={(e) =>
                            onImportanceChange(post.id, option.value, e)
                          }
                        >
                          <div
                            className={`h-3 w-3 rounded-full ${option.color}`}
                          ></div>
                          <span>{option.label} 중요도</span>
                          {post.importance === option.value && (
                            <CheckSquare className="ml-auto h-4 w-4 text-green-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <span className="text-xs text-gray-500">
                {formatDate(post.created_at)}
              </span>
            </div>
          </div>

          <h3 className="mb-2 text-lg font-medium">{post.title}</h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
                {post.author_avatar ? (
                  <Image
                    src={post.author_avatar}
                    alt={post.author_name || ''}
                    width={24}
                    height={24}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                    {post.author_name
                      ? post.author_name.charAt(0).toUpperCase()
                      : '?'}
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-600">{post.author_name}</span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{post.comments_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                <span>{post.likes_count}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* 메모 영역 */}
        <div className="mt-3 border-t pt-2">
          {editingMemo && editingMemo.postId === post.id ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={memoInputRef}
                value={editingMemo.memo}
                onChange={(e) =>
                  setEditingMemo({ ...editingMemo, memo: e.target.value })
                }
                className="h-20 w-full resize-none rounded-md border border-gray-300 p-2 text-sm focus:border-gold-start focus:outline-none focus:ring-1 focus:ring-gold-start"
                placeholder="북마크에 메모를 남겨보세요..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelEditingMemo}
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  onClick={saveMemo}
                  className="rounded bg-gold-start px-2 py-1 text-xs text-white hover:bg-gold-end"
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start justify-between">
              {post.memo ? (
                <p className="whitespace-pre-wrap text-sm text-gray-600">
                  {post.memo}
                </p>
              ) : (
                <p className="text-sm italic text-gray-400">메모 없음</p>
              )}
              {!selectionMode && (
                <button
                  onClick={startEditingMemo}
                  className="ml-2 hidden rounded p-1 text-gray-500 hover:bg-gray-100 group-hover:block"
                  title="메모 편집"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
