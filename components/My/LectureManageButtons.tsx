'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '../common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface lectureManageButtonProps {
  lectureId: number;
  instructor: string;
}

export default function LectureManageButtons({
  lectureId,
  instructor,
}: lectureManageButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [canManage, setCanManage] = useState(false);

  // 현재 사용자가 강의 작성자인지 확인
  useEffect(() => {
    const checkPermission = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .single();

      if (profile) {
        const instructorName = profile.nickname || profile.name;
        setCanManage(instructorName === instructor);
      }
    };

    checkPermission();
  }, [instructor]);

  const handleEdit = () => {
    if (!canManage) {
      showToast('권한이 없습니다.', 'error');
      return;
    }
    router.push(`/my/lectures/${lectureId}/edit`);
  };

  const handleDelete = async () => {
    if (!canManage) {
      showToast('권한이 없습니다.', 'error');
      return;
    }

    if (!window.confirm('정말 이 강의를 삭제하시겠습니까?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lectureId);

      if (error) throw error;

      showToast('강의가 삭제되었습니다.', 'success');
      router.push('/my/lectures');
    } catch (error) {
      console.error('Error deleting lecture:', error);
      showToast('강의 삭제에 실패했습니다.', 'error');
    }
  };

  if (!canManage) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={handleEdit}
        className="flex items-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        <Pencil className="h-4 w-4" />
        수정
      </button>
      <button
        onClick={handleDelete}
        className="flex items-center gap-1 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
      >
        <Trash2 className="h-4 w-4" />
        삭제
      </button>
    </div>
  );
}
