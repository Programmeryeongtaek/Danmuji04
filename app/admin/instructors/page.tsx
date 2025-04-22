'use client';

import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { Eye, Search, ShieldOff, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Instructor {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export default function InstructorsManagePage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInstructors, setFilteredInstructors] = useState<Instructor[]>(
    []
  );
  const [isAdmin, setIsAdmin] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const checkAdminAndLoadInstructors = async () => {
      const supabase = createClient();

      // 1. 먼저 관리자 권한 확인
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        router.push('/');
        showToast('관리자 권한이 필요합니다.', 'error');
        return;
      }

      setIsAdmin(true);

      // 2. 강사 목록 로드
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'instructor')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // 프로필 이미지 URL 처리
        const enhancedInstructors = await Promise.all(
          (data || []).map(async (instructor) => {
            let avatarUrl = instructor.avatar_url;

            if (avatarUrl) {
              const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(avatarUrl);

              avatarUrl = data.publicUrl;
            }

            return {
              ...instructor,
              avatar_url: avatarUrl,
            };
          })
        );

        setInstructors(enhancedInstructors);
        setFilteredInstructors(enhancedInstructors);
      } catch (error) {
        console.error('Error loading instructors:', error);
        showToast('강사 목록을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAndLoadInstructors();
  }, [router, showToast]);

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInstructors(instructors);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = instructors.filter(
      (instructor) =>
        (instructor.name?.toLowerCase().includes(query) ?? false) ||
        (instructor.nickname?.toLowerCase().includes(query) ?? false) ||
        (instructor.email?.toLowerCase().includes(query) ?? false)
    );

    setFilteredInstructors(filtered);
  }, [searchQuery, instructors]);

  const handleRevokeInstructor = async (
    instructorId: string,
    instructorName: string
  ) => {
    if (
      !confirm(
        `정말로 ${instructorName || '이 강사'}의 권한을 해제하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('profiles')
        .update({ role: 'normal' })
        .eq('id', instructorId);

      if (error) throw error;

      showToast('강사 권한이 해제되었습니다.', 'success');

      // UI에서 강사 제거
      setInstructors((prev) =>
        prev.filter((instr) => instr.id !== instructorId)
      );
      setFilteredInstructors((prev) =>
        prev.filter((instr) => instr.id !== instructorId)
      );
    } catch (error) {
      console.error('강사 권한 해제 실패:', error);
      showToast('강사 권한 해제에 실패했습니다.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">강사 관리</h1>
          <p className="text-gray-600">등록된 강사 목록을 관리합니다</p>
        </div>

        <Link
          href="/admin"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          관리자 대시보드로 돌아가기
        </Link>
      </div>

      {/* 검색창 */}
      <div className="mb-6 flex items-center rounded-lg border bg-white p-2 shadow-sm">
        <Search className="mx-2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름 또는 이메일로 검색"
          className="flex-1 border-none bg-transparent p-1 focus:outline-none"
        />
      </div>

      {/* 강사 목록 */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="grid grid-cols-12 items-center gap-4 bg-gray-50 p-4 font-medium text-gray-700">
          <div className="col-span-1">#</div>
          <div className="col-span-3">강사</div>
          <div className="col-span-3">이메일</div>
          <div className="col-span-2">등록일</div>
          <div className="col-span-3 text-right">관리</div>
        </div>

        {filteredInstructors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? '검색 결과가 없습니다' : '등록된 강사가 없습니다'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredInstructors.map((instructor, index) => (
              <div
                key={instructor.id}
                className="grid grid-cols-12 items-center gap-4 p-4"
              >
                <div className="col-span-1">{index + 1}</div>
                <div className="col-span-3">
                  <div className="flex items-center">
                    <div className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                      {instructor.avatar_url ? (
                        <Image
                          unoptimized
                          src={instructor.avatar_url}
                          alt={instructor.name || ''}
                          width={40}
                          height={40}
                          className="h-10 w-10 object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {instructor.nickname || instructor.name || '이름 없음'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3">
                  {instructor.email || '이메일 없음'}
                </div>
                <div className="col-span-2">
                  {new Date(instructor.created_at).toLocaleDateString()}
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      // 프로필 상세 보기 (미구현)
                      showToast('준비 중인 기능입니다.', 'info');
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      handleRevokeInstructor(
                        instructor.id,
                        instructor.nickname || instructor.name || '이 강사'
                      )
                    }
                    className="rounded-lg border border-red-500 px-3 py-1 text-sm text-red-500 hover:bg-red-50"
                  >
                    <ShieldOff className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
