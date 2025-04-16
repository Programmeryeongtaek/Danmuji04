'use client';

import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useToast } from '../common/Toast/Context';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ImageIcon, MessageSquare, Send, User, X } from 'lucide-react';

interface ChatRoomProps {
  studyId: string;
}

interface Message {
  id: string;
  study_id: string;
  user_id: string;
  user_name: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  avatar_url?: string | null;
}

interface Profile {
  id: string;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

export default function ChatRoom({ studyId }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  // 메시지 로드
  useEffect(() => {
    const loadMessages = async () => {
      if (!studyId) return;

      try {
        setIsLoading(true);
        const supabase = createClient();

        // 최근 50개 메시지 로드
        const { data, error } = await supabase
          .from('study_chat_messages')
          .select('*')
          .eq('study_id', studyId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // 프로필 정보 로드
        const userIds = [...new Set(data?.map((msg) => msg.user_id) || [])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, nickname, avatar_url')
          .in('id', userIds);

        const profileMap = new Map<string, Profile>();
        profiles?.forEach((profile) => {
          profileMap.set(profile.id, profile);
        });

        // 메시지에 프로필 정보 추가
        const messagesWithProfiles =
          data?.map((msg) => {
            const profile = profileMap.get(msg.user_id);

            let avatarUrl = null;
            if (profile?.avatar_url) {
              const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(profile.avatar_url);
              avatarUrl = urlData.publicUrl;
            }

            return {
              ...msg,
              user_name:
                profile?.nickname || profile?.name || msg.user_name || '익명',
              avatar_url: avatarUrl,
            };
          }) || [];

        setMessages(messagesWithProfiles);
      } catch (error) {
        console.error('채팅 메시지 로드 실패:', error);
        showToast('메시지를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [studyId, showToast]);

  // 실시간 메시지 구독
  useEffect(() => {
    if (!studyId) return;

    const supabase = createClient();

    // 채널 구독
    const channel = supabase
      .channel('public:study_chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_chat_messages',
          filter: `study_id=eq.${studyId}`,
        },
        async (payload) => {
          // 새 메시지가 도착했을 때
          const newMessage = payload.new as Message;

          // 프로필 정보 로드
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, nickname, avatar_url')
            .eq('id', newMessage.user_id)
            .single();

          let avatarUrl = null;
          if (profile?.avatar_url) {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(profile.avatar_url);
            avatarUrl = urlData.publicUrl;
          }

          // 메시지 상태 업데이트
          setMessages((prev) => [
            ...prev,
            {
              ...newMessage,
              user_name:
                profile?.nickname ||
                profile?.name ||
                newMessage.user_name ||
                '익명',
              avatar_url: avatarUrl,
            },
          ]);
        }
      )
      .subscribe();

    // 언마운트 시 구독 취소
    return () => {
      supabase.removeChannel(channel);
    };
  }, [studyId]);

  // 메시지 입력창 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 이미지 선택 처리
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setUploadedImage(null);
      setImagePreview(null);
      return;
    }

    const file = e.target.files[0];

    // 이미지 타입 확인
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다.', 'error');
      return;
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('이미지 크기는 5MB 미만이여야 합니다.', 'error');
      return;
    }

    setUploadedImage(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 이미지 업로드 처리
  const uploadImage = async (file: File): Promise<string | null> => {
    const supabase = createClient();

    const fileExt = file.name.split('.').pop();
    const fileName = `${studyId}-${Date.now()}.${fileExt}`;
    const filePath = `study-chat/${fileName}`;

    const { error } = await supabase.storage
      .from('community')
      .upload(filePath, file);

    if (error) {
      console.error('이미지 업로드 실패:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('community')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  // 메시지 전송
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    if (!newMessage.trim() && !uploadedImage) {
      return;
    }

    try {
      setIsSending(true);
      const supabase = createClient();

      // 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .single();

      const userName =
        profile?.nickname || profile?.name || user.email || '익명';

      // 이미지 업로드 (있는 경우)
      let imageUrl = null;
      if (uploadedImage) {
        imageUrl = await uploadImage(uploadedImage);
      }

      // 메시지 저장
      const { error } = await supabase
        .from('study_chat_messages')
        .insert({
          study_id: studyId,
          user_id: user.id,
          user_name: userName,
          content: newMessage.trim(),
          image_url: imageUrl,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      // 입력창 및 이미지 초기화
      setNewMessage('');
      setUploadedImage(null);
      setImagePreview(null);

      // 스터디 참여자 활동 기록 업데이트
      await supabase
        .from('study_participants')
        .update({ last_active_at: new Date().toISOString() })
        .eq('study_id', studyId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      showToast('메시지 전송에 실패했습니다.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // 날짜 포맷팅
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // 오늘
      return format(date, 'a h:mm', { locale: ko });
    } else if (diffDays < 7) {
      // 일주일 이내
      return format(date, 'E a h:mm', { locale: ko });
    } else {
      // 일주일 이상
      return format(date, 'yyyy.MM.dd a h:mm', { locale: ko });
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border bg-white shadow-sm">
      {/* 채팅방 헤더 */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="flex items-center gap-2 font-medium">
          <MessageSquare className="h-5 w-5" />
          <span>실시간 토론</span>
        </h3>
        <div className="text-sm text-gray-500">
          {messages.length > 0
            ? `${messages.length}개의 메시지`
            : '메시지 없음'}
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200">
                    {message.avatar_url ? (
                      <img
                        src={message.avatar_url}
                        alt={message.user_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{message.user_name}</span>
                    <span className="text-xs text-gray-500">
                      {formatMessageDate(message.created_at)}
                    </span>
                  </div>
                  {message.content && (
                    <p className="mt-1 text-gray-800">{message.content}</p>
                  )}
                  {message.image_url && (
                    <div className="mt-2 max-w-xs overflow-hidden rounded-lg">
                      <img
                        src={message.image_url}
                        alt="첨부 이미지"
                        className="w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center text-gray-500">
            <MessageSquare className="mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium">채팅이 없습니다</p>
            <p className="mt-1 text-sm">
              실시간으로 팀원들과 소통하고 의견을 나눠보세요
            </p>
          </div>
        )}
      </div>

      {/* 이미지 미리보기 */}
      {imagePreview && (
        <div className="relative mx-4 mb-2">
          <div className="relative inline-block max-h-32 max-w-xs overflow-hidden rounded-lg border">
            <img
              src={imagePreview}
              alt="미리보기"
              className="h-full max-h-32 w-auto object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setUploadedImage(null);
                setImagePreview(null);
              }}
              className="absolute right-1 top-1 rounded-full bg-gray-800/70 p-1 text-white hover:bg-gray-700/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 메시지 입력 폼 */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || (!newMessage.trim() && !uploadedImage)}
            className="flex-shrink-0 rounded-full bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isSending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
