'use client';

import { CourseWriting } from '@/app/types/course/courseModel';
import Button from '@/components/common/Button/Button';
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
  const [isPublic, setIsPublic] = useState<boolean>(
    userWriting?.is_public ?? true
  );
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
      <h2 className="mb-4 text-xl font-semibold">내용 정리하기</h2>

      {isEditing ? (
        <div className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-64 w-full rounded-lg border p-4 focus:outline-none focus:ring-2 focus:ring-gold-start"
            placeholder="느낀 점이나 알게 된 내용을 글로 정리해보세요."
          />

          <div className="flex justify-between">
            <label className="flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mr-2"
              />
              <span>내용 공개</span>
            </label>

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

              <Button
                onClick={handleSave}
                className="px-4 py-2 text-white disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? '저장 중...' : userWriting ? '수정' : '작성'}
              </Button>
            </div>
          </div>

          {error && <div className="text-red-500">{error}</div>}
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

            <Button onClick={() => setIsEditing(true)} className="px-4 py-2">
              수정
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
