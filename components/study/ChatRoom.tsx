'use client';

import { userAtom } from '@/store/auth';
import { useAtomValue } from 'jotai';
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  const [totalMessageCount, setTotalMessageCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAtomValue(userAtom);
  const { showToast } = useToast();

  // 채팅 내용 무한 스크롤
  const [isNewMessageAdded, setIsNewMessageAdded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 채팅 메시지 후, 포커스
  const messageInputRef = useRef<HTMLInputElement>(null);

  // 메시지 ID 추적을 위한 Set
  const processedMessageIds = useRef(new Set<string>());

  // 메시지 로드
  const loadMessages = async (offset = 0) => {
    if (!studyId) return;

    try {
      if (offset === 0) {
        setIsLoading(true);
      }
      const supabase = createClient();

      // 총 메시지 수 조회 (페이지 첫 로드 시)
      if (offset === 0) {
        await fetchTotalMessageCount();
      }

      // 최근 메시지 30개씩 로드
      const { data, error } = await supabase
        .from('study_chat_messages')
        .select('*')
        .eq('study_id', studyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + 29); // 페이지네이션 적용

      if (data) data.reverse();

      if (error) throw error;

      // 더 로드할 메시지가 있는지 확인
      setHasMoreMessages(data.length === 30);

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

          // 처리된 메시지 ID 추가
          processedMessageIds.current.add(msg.id);

          return {
            ...msg,
            user_name:
              profile?.nickname || profile?.name || msg.user_name || '익명',
            avatar_url: avatarUrl,
          };
        }) || [];

      // 초기 로드인지 추가 로드인지에 따라 처리
      if (offset === 0) {
        setMessages(messagesWithProfiles);
      } else {
        // 중복 메시지 제거하며 병합
        setMessages((prev) => {
          const existingIds = new Set(prev.map((msg) => msg.id));
          const newMessages = messagesWithProfiles.filter(
            (msg) => !existingIds.has(msg.id)
          );
          return [...newMessages, ...prev]; // 새로 로드한 메시지가 먼저 오도록
        });
      }
    } catch (error) {
      console.error('채팅 메시지 로드 실패:', error);
      showToast('메시지를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 초기 메시지 로드
  useEffect(() => {
    loadMessages();
  }, [studyId]);

  // 더 많은 메시지 로드 함수
  const loadMoreMessages = () => {
    if (isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);

    // 현재 스크롤 위치 및 높이 저장
    const messagesContainer = messagesContainerRef.current;
    const scrollHeight = messagesContainer ? messagesContainer.scrollHeight : 0;
    const scrollPosition = messagesContainer ? messagesContainer.scrollTop : 0;

    loadMessages(messages.length).then(() => {
      // 메시지 로드 완료 후, 새로 추가된 높이만큼 스크롤 조정
      setTimeout(() => {
        if (messagesContainer) {
          const newScrollHeight = messagesContainer.scrollHeight;
          const heightDifference = newScrollHeight - scrollHeight;
          messagesContainer.scrollTop = scrollPosition + heightDifference;
        }
        setIsLoadingMore(false);
      }, 100);
    });
  };

  // 스크롤 이벤트 감지
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    // 초기 로드 시에만 스크롤을 아래로 이동 (이전 메시지 로딩 시에는 스크롤 유지)
    if (
      messages.length > 0 &&
      !isLoadingMore &&
      !isLoading &&
      !hasMoreMessages
    ) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 새 메시지가 추가된 경우에만 스크롤 아래로
    if (isNewMessageAdded) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      setIsNewMessageAdded(false);
    }
  }, [
    messages.length,
    isLoadingMore,
    isLoading,
    isNewMessageAdded,
    hasMoreMessages,
  ]);

  // 스크롤 이벤트 핸들러
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    // 스크롤 이벤트 핸들러 - 이벤트 전파 방지
    const handleScroll = (e: Event) => {
      e.stopPropagation();
    };

    // 이벤트 리스너 추가
    messagesContainer.addEventListener('scroll', handleScroll, {
      passive: false,
    });

    // 클린업 함수
    return () => {
      messagesContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

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

          // 이미 처리된 메시지인지 확인
          if (processedMessageIds.current.has(newMessage.id)) {
            return; // 이미 처리된 메시지는 무시
          }

          // ID 추적 Set에 추가
          processedMessageIds.current.add(newMessage.id);

          // 새 메시지가 추가되면 총 메시지 수 증가
          setTotalMessageCount((prev) => prev + 1);

          try {
            // 프로필 정보 로드
            const supabase = createClient();
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

            // 강화된 메시지 생성
            const enhancedMessage = {
              ...newMessage,
              user_name:
                profile?.nickname ||
                profile?.name ||
                newMessage.user_name ||
                '익명',
              avatar_url: avatarUrl,
            };

            // 메시지를 기존 목록에 정확한 시간순으로 추가
            setMessages((prev) => {
              const messageExists = prev.some(
                (msg) => msg.id === newMessage.id
              );
              if (messageExists) return prev;

              const updatedMessages = [...prev, enhancedMessage];
              return updatedMessages.sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );
            });
          } catch (error) {
            console.error('메시지 처리 실패:', error);

            // 오류 발생해도 기본 메시지는 추가
            setMessages((prev) => {
              const messageExists = prev.some(
                (msg) => msg.id === newMessage.id
              );
              if (messageExists) return prev;

              const updatedMessages = [
                ...prev,
                {
                  ...newMessage,
                  user_name: newMessage.user_name || '익명',
                  avatar_url: null,
                },
              ];
              return updatedMessages.sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );
            });
          }
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
    // 최초 로딩 또는 새 메시지가 추가된 경우에만 스크롤
    if (
      messagesEndRef.current &&
      (isNewMessageAdded || (!isLoading && messages.length > 0))
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      setIsNewMessageAdded(false); // 스크롤 후 플래그 초기화
    }
  }, [messages, isNewMessageAdded, isLoading]);

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
        .select('name, nickname, avatar_url')
        .eq('id', user.id)
        .single();

      const userName =
        profile?.nickname || profile?.name || user.email || '익명';

      let avatarUrl = null;
      if (profile?.avatar_url) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(profile.avatar_url);
        avatarUrl = urlData.publicUrl;
      }

      // 이미지 업로드 (있는 경우)
      let imageUrl = null;
      if (uploadedImage) {
        imageUrl = await uploadImage(uploadedImage);
      }

      // 현재 시간 생성
      const now = new Date().toISOString();

      // 메시지 저장
      const { data: newMessageData, error } = await supabase
        .from('study_chat_messages')
        .insert({
          study_id: studyId,
          user_id: user.id,
          user_name: userName,
          content: newMessage.trim(),
          image_url: imageUrl,
          created_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      // 새 메시지 ID를 Set에 추가 (중복 방지)
      processedMessageIds.current.add(newMessageData.id);

      // 메시지가 성공적으로 전송되면 totalMessageCount 증가
      setTotalMessageCount((prev) => prev + 1);

      // 메시지를 UI에 직접 추가 (서버 응답 기다리지 않고)
      setMessages((prev) => {
        const enhancedMessage = {
          ...newMessageData,
          avatar_url: avatarUrl,
        };

        const updatedMessages = [...prev, enhancedMessage];
        return updatedMessages.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      // 새 메시지 전송 시 스크롤 플래그 활성화
      setIsNewMessageAdded(true);

      // 입력창 및 이미지 초기화
      setNewMessage('');
      setUploadedImage(null);
      setImagePreview(null);

      // 스터디 참여자 활동 기록 업데이트
      await supabase
        .from('study_participants')
        .update({ last_active_at: now })
        .eq('study_id', studyId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      showToast('메시지 전송에 실패했습니다.', 'error');
    } finally {
      setIsSending(false);
      // 전송 완료 후 입력창에 포커스 - 시간차를 두고 실행
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 100);
    }
  };

  // 총 메시지 수를 가져오는 함수
  const fetchTotalMessageCount = async () => {
    const supabase = createClient();
    try {
      const { count, error } = await supabase
        .from('study_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('study_id', studyId);

      if (error) {
        console.error('총 메시지 수 조회 실패:', error);
        return;
      }

      setTotalMessageCount(count || 0);
    } catch (error) {
      console.error('메시지 수 조회 중 오류:', error);
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

  // 메시지 렌더링 최적화 - useMemo로 메시지 정렬
  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages]);

  return (
    <div
      style={{ overscrollBehavior: 'none' }}
      className="flex h-full flex-col rounded-lg border bg-white shadow-sm"
    >
      {/* 채팅방 헤더 */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="flex items-center gap-2 font-medium">
          <MessageSquare className="h-5 w-5" />
          <span>실시간 토론</span>
        </h3>
        <div className="text-sm text-gray-500">
          {isLoading
            ? '로딩 중...'
            : totalMessageCount > 0
              ? `총 ${totalMessageCount}개의 메시지`
              : '메시지 없음'}
        </div>
      </div>

      {/* 메시지 목록 */}
      <div
        ref={messagesContainerRef}
        style={{ overscrollBehavior: 'contain' }}
        onTouchMove={(e) => e.stopPropagation()}
        className="flex-1 overflow-y-auto bg-light p-4"
      >
        {/* 로딩 인디케이터 */}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
          </div>
        )}

        {/* 이전 메시지 보기 버튼 */}
        {hasMoreMessages && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                loadMoreMessages();
              }}
              disabled={isLoadingMore}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isLoadingMore ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              )}
              {isLoadingMore ? '로딩 중...' : '이전 메시지 보기'}
            </button>
          </div>
        )}

        {isLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
          </div>
        ) : sortedMessages.length > 0 ? (
          <div className="space-y-4">
            {sortedMessages.map((message) => (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className="flex gap-3"
              >
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
            <p className="font-medium">채팅이 없습니다.</p>
            <p className="mt-1 text-sm">
              실시간으로 팀원들과 소통하고 의견을 나눠보세요.
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
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || (!newMessage.trim() && !uploadedImage)}
            className="flex-shrink-0 rounded-full bg-gold-start p-2 text-white hover:bg-gold-start disabled:opacity-50"
          >
            {isSending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <Send className="bg-gold h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
