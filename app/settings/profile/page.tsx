'use client';

import { createClient } from '@/utils/supabase/client';
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { checkNicknameDuplicate, updateProfile } from './actions';
import { Upload, X } from 'lucide-react';
import useDebounce from '@/hooks/useDebounce';

type Interest = '인문학' | '철학' | '심리학' | '경제학' | '자기계발' | '리더십';

interface Profile {
  id: string;
  user_name: string;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  avatar_updated_at: string;
  created_at: string;
  role: string;
}

const interests: Interest[] = [
  '인문학',
  '철학',
  '심리학',
  '경제학',
  '자기계발',
  '리더십',
];

const ProfileSettingsPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentNickname, setCurrentNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  const debouncedNickname = useDebounce(currentNickname, 500);

  const fetchProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('인증되지 않은 사용자입니다.');
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('프로필 조회 오류:', error);
        throw error;
      }

      setProfile(profileData);
      setCurrentNickname(profileData?.nickname || '');
      setSelectedInterests(profileData?.interests || []);
    } catch (error) {
      console.error('프로필 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const checkNicknameDebounced = async () => {
      if (!debouncedNickname || debouncedNickname === profile?.nickname) {
        setNicknameError('');
        return;
      }

      setIsCheckingNickname(true);
      const { isDuplicate } = await checkNicknameDuplicate(debouncedNickname);
      setIsCheckingNickname(false);

      if (isDuplicate) {
        setNicknameError('이미 사용 중인 닉네임입니다.');
      } else {
        setNicknameError('');
      }
    };

    checkNicknameDebounced();
  }, [debouncedNickname, profile?.nickname]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setIsEditing(true);
  };

  const removeImage = () => {
    setImagePreview(null);
    const input = document.querySelector(
      'input[name="profileImage"]'
    ) as HTMLInputElement;
    if (input) input.value = '';
    setIsEditing(true);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
    setIsEditing(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEditing || nicknameError) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.set('nickname', currentNickname);
      formData.set('interests', JSON.stringify(selectedInterests));

      console.log('업데이트 시도:', formData.get('nickname')); // 디버깅

      const result = await updateProfile(formData);

      console.log('업데이트 결과:', result); // 디버깅

      if (result.error) {
        console.error('업데이트 실패:', result.error);
        return;
      }

      // 성공적으로 업데이트된 경우에만 프로필 새로고침
      await fetchProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('제출 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center">
        프로필을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 수정 불가능한 정보 */}
        <section className="space-y-4 rounded-lg bg-gray-50 p-4">
          <h2 className="font-medium text-gray-900">기본 정보</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">이름</label>
              <p className="mt-1 text-gray-900">{profile.user_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">닉네임</label>
              <p className="mt-1 text-gray-900">
                {currentNickname || profile?.nickname || '없음'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">이메일</label>
              <p className="mt-1 text-gray-900">{profile.email || '미설정'}</p>
            </div>
          </div>
        </section>

        {/* 수정 가능한 정보 */}
        <div className="space-y-6">
          {/* 닉네임 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                닉네임
              </label>
              {profile.nickname && (
                <span className="text-sm text-gray-500">
                  현재: {profile.nickname || '없음'}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <input
                type="text"
                name="nickname"
                value={currentNickname}
                onChange={(e) => {
                  setCurrentNickname(e.target.value);
                  setIsEditing(true);
                }}
                className={`w-full rounded-lg border p-2 ${
                  nicknameError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:border-gold-start focus:ring-gold-start/20'
                }`}
                placeholder="닉네임을 입력해주세요"
              />
              {isCheckingNickname && (
                <p className="text-sm text-gray-500">중복 확인 중...</p>
              )}
              {nicknameError && (
                <p className="text-sm text-red-500">{nicknameError}</p>
              )}
            </div>
          </section>

          {/* 프로필 이미지 */}
          <section className="space-y-4">
            <label className="text-sm font-medium text-gray-700">
              프로필 이미지
            </label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24">
                {imagePreview || profile.avatar_url ? (
                  <>
                    <img
                      src={imagePreview || profile.avatar_url!}
                      alt="Profile"
                      className="h-24 w-24 rounded-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <input
                type="file"
                name="profileImage"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="profileImage"
              />
              <label
                htmlFor="profileImage"
                className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
              >
                이미지 {imagePreview ? '변경' : '업로드'}
              </label>
            </div>
          </section>

          {/* 관심 분야 */}
          <section className="space-y-4">
            <label className="text-sm font-medium text-gray-700">
              관심 분야
            </label>

            {/* 기본 관심 분야 선택 */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {interests.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-lg px-4 py-2 text-sm ${
                    selectedInterests.includes(interest)
                      ? 'bg-gold-start text-white'
                      : 'border border-gray-300 hover:border-gold-start hover:bg-gray-50'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>

            {/* 추가 관심 분야 입력 */}
            <div className="relative">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 pr-20"
                placeholder="기타 관심 분야 입력"
                maxLength={10}
              />
              <button
                type="button"
                onClick={() => {
                  if (
                    newInterest.trim() &&
                    !selectedInterests.includes(newInterest.trim())
                  ) {
                    setSelectedInterests((prev) => [
                      ...prev,
                      newInterest.trim(),
                    ]);
                    setNewInterest('');
                    setIsEditing(true);
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              >
                추가
              </button>
            </div>

            {/* 선택된 관심 분야들 */}
            <div className="flex flex-wrap gap-2">
              {selectedInterests.map((interest) => (
                <div
                  key={interest}
                  className="flex items-center gap-1 rounded-full bg-gold-start px-4 py-2 text-sm text-white"
                >
                  <span>{interest}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInterests((prev) =>
                        prev.filter((i) => i !== interest)
                      );
                      setIsEditing(true);
                    }}
                    className="ml-1 rounded-full p-0.5 text-white opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <button
          type="submit"
          disabled={loading || !isEditing || Boolean(nicknameError)}
          className="w-full rounded-lg bg-gradient-to-r from-gold-start to-gold-end py-2 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '저장 중...' : '변경사항 저장'}
        </button>
      </form>
    </div>
  );
};

export default ProfileSettingsPage;
