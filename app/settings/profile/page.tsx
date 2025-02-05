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
import { Upload, User, X } from 'lucide-react';
import useDebounce from '@/hooks/useDebounce';
import Image from 'next/image';

type Interest = '인문학' | '철학' | '심리학' | '경제학' | '자기계발' | '리더십';

export interface Profile {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  interests: string[];
  role: string;
  marketing_agree: boolean;
  created_at: string;
  updated_at: string;
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
  const [currentProfileImage, setCurrentProfileImage] = useState<string>('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(
    null
  );
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  const debouncedNickname = useDebounce(currentNickname, 500);

  const fetchProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('인증되지 않은 사용자입니다.');

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      console.log('Profile data before URL:', profileData); // 디버깅

      // 여기서 이미지 URL 처리를 수정
      let fullAvatarUrl = null;
      if (profileData?.avatar_url) {
        const {
          data: { publicUrl },
        } = supabase.storage
          .from('avatars')
          .getPublicUrl(profileData.avatar_url);
        fullAvatarUrl = publicUrl;
        console.log('Generated avatar URL:', fullAvatarUrl); // 디버깅
      }

      const updatedProfileData = {
        ...profileData,
        avatar_url: fullAvatarUrl,
      };

      console.log('Final profile data:', updatedProfileData); // 디버깅

      setProfile(updatedProfileData);
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
    if (profile?.avatar_url) {
      setCurrentProfileImage(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

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

  const handleImageUpload = async (file: File) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('인증되지 않은 사용자입니다.');

      // 파일명 생성
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Profiles 테이블 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Public URL 가져오기
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('이미지 업로드 에러:', error);
      throw error;
    }
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }

    // 이미지 미리보기만 설정하고 실제 업로드는 하지 않음
    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setPendingImage(file);
    setIsEditing(true);
  };

  const removeImage = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('인증되지 않은 사용자입니다.');

      // Storage에서 기존 이미지 삭제 (필요한 경우)
      if (profile?.avatar_url) {
        // Storage에서 기존 이미지 파일명 추출
        const fileName = profile.avatar_url.split('/').pop();
        if (fileName) {
          // Storage에서 이미지 삭제
          await supabase.storage.from('avatars').remove([fileName]);
        }

        // Profiles 테이블 업데이트
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      // 입력 필드 초기화
      const input = document.querySelector(
        'input[name="profileImage"]'
      ) as HTMLInputElement;
      if (input) input.value = '';
      setIsEditing(true);
    } catch (error) {
      console.error('이미지 삭제 에러:', error);
      alert('이미지 삭제에 실패했습니다.');
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
    setIsEditing(true);
  };

  const handleReset = async () => {
    setCurrentNickname(profile?.nickname || '');
    setSelectedInterests(profile?.interests || []);
    setPendingImage(null);
    setPendingImagePreview(null);
    setIsEditing(false);

    // 입력 필드 초기화
    const input = document.querySelector(
      'input[name="preofileImage"]'
    ) as HTMLInputElement;
    if (input) input.value = '';
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

      // 이미지 업로드 처리
      if (pendingImage) {
        await handleImageUpload(pendingImage);
      }

      const result = await updateProfile(formData);

      console.log('업데이트 결과:', result); // 디버깅

      if (result.error) {
        console.error('업데이트 실패:', result.error);
        return;
      }

      // 성공적으로 업데이트된 경우에만 프로필 새로고침
      setPendingImage(null);
      setPendingImagePreview(null);
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
            {/* 프로필 이미지 */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">프로필 이미지</span>
              <div className="h-20 w-20 overflow-hidden rounded-full">
                {currentProfileImage ? (
                  <Image
                    src={currentProfileImage || ''}
                    width={24}
                    height={24}
                    alt="프로필 이미지"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-200">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* 이름 */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">이름</span>
              <p className="text-gray-900">{profile?.name}</p>
            </div>

            {/* 닉네임 */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">닉네임</span>
              <p className="text-gray-900">{profile?.nickname || '없음'}</p>
            </div>

            {/* 이메일 */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">이메일</span>
              <p className="text-gray-900">{profile?.email}</p>
            </div>

            {/* 관심 분야 */}
            <div className="flex items-start gap-4">
              <span className="text-sm text-gray-600">관심 분야</span>
              <div className="flex flex-wrap gap-2">
                {profile?.interests && profile.interests.length > 0 ? (
                  profile.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-gold-start/10 px-3 py-1 text-sm text-gray-700"
                    >
                      {interest}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">
                    선택된 관심분야가 없습니다
                  </span>
                )}
              </div>
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
              <div className="h-200 w-200 relative">
                {pendingImagePreview ? (
                  <>
                    <Image
                      src={pendingImagePreview}
                      width={150}
                      height={150}
                      alt="Preview"
                      className="rounded-full"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        removeImage();
                        setPendingImage(null);
                        setPendingImagePreview(null);
                        setCurrentProfileImage('');
                        setIsEditing(true);
                      }}
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
                이미지 {pendingImagePreview ? '변경' : '업로드'}
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

        <div className="flex gap-4">
          <button
            type="button" // submit이 아닌 button 타입으로 설정
            onClick={handleReset}
            className="w-1/2 rounded-lg border border-gray-300 py-2 text-gray-700 transition-all hover:bg-gray-50"
          >
            초기화
          </button>
          <button
            type="submit"
            disabled={loading || !isEditing || Boolean(nicknameError)}
            className="w-1/2 rounded-lg bg-gradient-to-r from-gold-start to-gold-end py-2 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettingsPage;
