'use client';

import { CourseWriting } from '@/app/types/course/courseModel';
import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface WritingSectionProps {
  courseId: string;
  itemId: string;
  userWriting: CourseWriting | null;
  onWritingSaved: (writing: CourseWriting) => void;
  onWritingDeleted: () => void;
}

export default function WritingSection({
  courseId,
  itemId,
  userWriting,
  onWritingSaved,
  onWritingDeleted,
}: WritingSectionProps) {
  const [content, setContent] = useState(userWriting?.content || '');
  const [isPublic, setIsPublic] = useState<boolean>(
    userWriting?.is_public ?? true
  );
  const [isEditing, setIsEditing] = useState(!userWriting);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

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
        showToast('내용이 수정되었습니다.', 'success');
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
        showToast('내용이 저장되었습니다.', 'success');
      }

      setIsEditing(false);
    } catch (error) {
      console.error('글 저장 중 오류:', error);
      showToast('글을 저장하는 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  // 글 삭제 기능
  const handleDelete = async () => {
    if (!userWriting || !confirm('정말로 글을 삭제하시겠습니까?')) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('course_writings')
        .delete()
        .eq('id', userWriting.id);

      if (error) throw error;

      onWritingDeleted();
      showToast('글이 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('글 삭제 중 오류:', error);
      showToast('글 삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div className="flex flex-col">
      {isEditing ? (
        <>
          <div className="relative flex flex-col pb-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="h-64 w-full rounded-lg border p-4 focus:bg-light focus:outline-none focus:ring-2 focus:ring-gold-start"
              placeholder="느낀 점이나 알게 된 내용을 글로 정리해보세요."
            />
            {error && (
              <span className="absolute -bottom-0 text-red-500">{error}</span>
            )}
          </div>

          <div className="flex justify-between">
            <label className="flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mr-2 h-4 w-4 accent-gold-start"
              />
              <span>공개</span>
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
        </>
      ) : (
        <div className="relative">
          <div className="absolute -top-10 right-0 flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-blue-200 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="rounded-lg border bg-light p-4">
            <p className="h-64 whitespace-pre-wrap">{userWriting?.content}</p>
          </div>
        </div>
      )}
    </div>
  );
}
