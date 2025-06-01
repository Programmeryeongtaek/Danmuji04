'use client';

import { useToast } from '@/components/common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import {
  ArrowLeft,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Role = 'normal' | 'instructor' | 'manager' | 'admin';

interface UserProfile {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
}

export default function UserRolesManagePage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const checkAdminAndLoadUsers = async () => {
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
      setCurrentAdminId(user.id);

      // 2. 사용자 목록 로드
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // 프로필 이미지 URL 처리
        const enhancedUsers = await Promise.all(
          (data || []).map(async (user) => {
            let avatarUrl = user.avatar_url;

            if (avatarUrl) {
              const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(avatarUrl);

              avatarUrl = data.publicUrl;
            }

            return {
              ...user,
              avatar_url: avatarUrl,
            };
          })
        );

        setUsers(enhancedUsers);
        setFilteredUsers(enhancedUsers);
      } catch (error) {
        console.error('Error loading users:', error);
        showToast('사용자 목록을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAndLoadUsers();
  }, [router, showToast]);

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        (user.name?.toLowerCase().includes(query) ?? false) ||
        (user.nickname?.toLowerCase().includes(query) ?? false) ||
        (user.email?.toLowerCase().includes(query) ?? false)
    );

    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // 권한 변경 함수
  const handleRoleChange = async (userId: string, newRole: Role) => {
    // 자기 자신의 관리자 권한을 해제하려고 하는 경우 방지
    if (userId === currentAdminId && newRole !== 'admin') {
      showToast('자신의 관리자 권한은 해제할 수 없습니다.', 'error');
      return;
    }

    // 이미 해당 권한을 가진 경우 중복 실행 방지
    const userToUpdate = users.find((u) => u.id === userId);
    if (userToUpdate?.role === newRole) {
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('권한 변경 API 오류:', error);
        showToast(`권한 변경 중 오류 발생: ${error.message}`, 'error');
        return;
      }

      // 데이터베이스 업데이트 확인
      const { data: checkData, error: checkError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (checkError) {
        console.error('권한 확인 오류:', checkError);
      } else {
        if (checkData.role !== newRole) {
          console.warn('권한이 예상대로 변경되지 않았습니다:', checkData.role);
          showToast(
            '권한이 변경되었으나 예상과 다릅니다. 새로고침해주세요.',
            'error'
          );
        } else {
          showToast(
            `사용자 권한이 ${getRoleLabel(newRole)}(으)로 변경되었습니다.`,
            'success'
          );
        }
      }

      // UI 업데이트
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      setFilteredUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      console.error('권한 변경 실패:', error);
      showToast('권한 변경에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: Role): string => {
    switch (role) {
      case 'normal':
        return '일반 사용자';
      case 'instructor':
        return '강사';
      case 'manager':
        return '매니저';
      case 'admin':
        return '관리자';
      default:
        return '알 수 없음';
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
    <div className="mx-auto mobile:mb-10 mobile:px-4 mobile:py-12 tablet:mb-0 tablet:px-6">
      <div className="flex justify-between mobile:mb-4 tablet:mb-6 laptop:mb-8">
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <Link
          href="/admin"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:border-gold-start hover:bg-gold-start hover:text-black"
        >
          <ArrowLeft className="h-5 w-5" />
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

      {/* 사용자 목록 */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="items-center gap-4 bg-gray-50 p-4 font-medium text-gray-700 mobile:hidden tablet:grid tablet:grid-cols-12">
          <div className="col-span-1">#</div>
          <div className="col-span-3">사용자</div>
          <div className="col-span-3">이메일</div>
          <div className="col-span-2">가입일</div>
          <div className="col-span-3">권한</div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? '검색 결과가 없습니다' : '사용자가 없습니다'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className="grid items-center gap-4 p-4 tablet:grid-cols-12"
              >
                <div className="col-span-1 mobile:hidden tablet:block">
                  {index + 1}
                </div>
                <div className="col-span-3">
                  <div className="flex items-center">
                    <div className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                      {user.avatar_url ? (
                        <Image
                          unoptimized
                          src={user.avatar_url}
                          alt={user.name || ''}
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
                        {user.nickname || user.name || '이름 없음'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3">{user.email || '이메일 없음'}</div>
                <div className="col-span-2">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
                <div className="col-span-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleRoleChange(user.id, 'normal')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition ${
                        user.role === 'normal'
                          ? 'bg-gray-200 font-medium text-gray-800'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <User
                        className={`h-4 w-4 ${user.role === 'normal' ? 'text-gray-700' : 'text-gray-500'}`}
                      />
                      <span>일반</span>
                    </button>

                    <button
                      onClick={() => handleRoleChange(user.id, 'instructor')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition ${
                        user.role === 'instructor'
                          ? 'bg-blue-100 font-medium text-blue-800'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <ShieldCheck
                        className={`h-4 w-4 ${user.role === 'instructor' ? 'text-blue-600' : 'text-gray-500'}`}
                      />
                      <span>강사</span>
                    </button>

                    <button
                      onClick={() => handleRoleChange(user.id, 'manager')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition ${
                        user.role === 'manager'
                          ? 'bg-purple-100 font-medium text-purple-800'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <ShieldCheck
                        className={`h-4 w-4 ${user.role === 'manager' ? 'text-purple-600' : 'text-gray-500'}`}
                      />
                      <span>매니저</span>
                    </button>

                    <button
                      onClick={() => handleRoleChange(user.id, 'admin')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition ${
                        user.role === 'admin'
                          ? 'bg-red-100 font-medium text-red-800'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                      disabled={user.id === currentAdminId} // 자신의 관리자 권한 변경 방지
                    >
                      <ShieldAlert
                        className={`h-4 w-4 ${user.role === 'admin' ? 'text-red-600' : 'text-gray-500'}`}
                      />
                      <span>관리자</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
