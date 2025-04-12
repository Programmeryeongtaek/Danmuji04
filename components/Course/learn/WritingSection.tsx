'use client';

import { CourseWriting } from '@/types/course/courseModel';
import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';

interface WritingSectionProps {
  courseId: string;
  itemId: string;
  userWriting: CourseWriting | null;
  onWritingSaved: (writing: CourseWriting) => void;
}

export default function WritingSection({
  courseId,
  itemId,
  userWriting,
  onWritingSaved,
}: WritingSectionProps) {
  const [content, setContent] = useState(userWriting?.content || '');
  const [isPublic, setIsPublic] = useState(userWriting?.is_public || true);
  const [isEditing, setIsEditing] = useState(!userWriting);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('로그인이 필요합니다.');
        return;
      }

      // 유저 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .single();

      const userName = profile?.nickname || profile?.name;

      if (userWriting) {
        // 기존 글 업데이트
        const { data, error: updateError } = await supabase
          .from('course_writings')
          .update({
            content,
            is_public: isPublic,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userWriting.id)
          .select()
          .single();

        if (updateError) throw updateError;
        onWritingSaved(data);
      } else {
        // 새 글 작성
        const { data, error: insertError } = await supabase
          .from('course_writings')
          .insert({
            user_id: user.id,
            user_name: userName,
            course_id: courseId,
            item_id: itemId,
            content,
            is_public: isPublic,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        onWritingSaved(data);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('글 저장 중 오류:', error);
      setError('글을 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-8 border-t pt-6">
      <h2 className="mb-4 text-xl font-semibold">나의 생각 정리하기</h2>

      {isEditing ? (
        <div className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-64 w-full rounded-lg border p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="강의를 보고 느낀 점이나 배운 내용을 정리해보세요."
          />

          <div className="flex items-center">
            <label className="flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mr-2"
              />
              <span>다른 사람들에게 공개하기</span>
            </label>
          </div>

          {error && <div className="text-red-500">{error}</div>}

          <div className="flex justify-end space-x-2">
            {userWriting && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setContent(userWriting.content);
                  setIsPublic(userWriting.is_public);
                }}
                className="rounded-lg border px-4 py-2"
                disabled={isSaving}
              >
                취소
              </button>
            )}

            <button
              onClick={handleSave}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : userWriting ? '수정 완료' : '저장하기'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="whitespace-pre-wrap">{userWriting?.content}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {userWriting?.is_public
                ? '다른 사람들에게 공개되었습니다.'
                : '나만 볼 수 있습니다.'}
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
            >
              수정하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
