'use client';

import { useToast } from '@/components/common/Toast/Context';
import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { useAtomValue } from 'jotai';
import { CheckCircle, Mail, MessageSquare } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { showToast } = useToast();
  const user = useAtomValue(userAtom);

  //TODO: 문의하기 작성하면, 관리자에게 알림이 가도록 구현
  //TODO: 이메일 알림 발송 기능 구현

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

      if (data) {
        setName(data.name || '');
        setEmail(data.email || user.email || '');
      }
    };

    loadUserData();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name || !email || !subject || !message) {
      showToast('모든 필드를 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 문의 내용 저장
      const { data: contactData, error } = await supabase
        .from('contact_messages')
        .insert({
          user_id: user?.id || null,
          name,
          email,
          subject,
          message,
          status: 'unread',
        })
        .select()
        .single();

      if (error) throw error;

      // 관리자에게 알림 생성
      await createAdminNotifications(supabase, contactData.id, name, subject);

      setIsSubmitted(true);
      showToast('문의가 성공적으로 전송되었습니다.', 'success');
    } catch (error) {
      console.error('Error submitting contact form:', error);
      showToast('제출 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 관리자에게 알림 생성 함수
  const createAdminNotifications = async (
    supabase: SupabaseClient,
    inquiryId: number,
    senderName: string,
    inquirySubject: string
  ) => {
    try {
      // 관리자 목록 가져오기
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (!admins || admins.length === 0) {
        console.log('알림을 보낼 관리자가 없습니다.');
        return;
      }

      // 각 관리자에게 알림 생성
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        title: '새로운 문의 접수',
        message: `${senderName}님이 "${inquirySubject}" 주제로 문의를 남겼습니다.`,
        type: 'contact_inquiry',
        related_data: { inquiry_id: inquiryId },
        read: false,
      }));

      await supabase.from('notifications').insert(notifications);
      console.log('관리자 알림 생성 완료');
    } catch (error) {
      console.error('관리자 알림 생성 실패:', error);
      // 주요 기능 완료했으므로 알림 실패는 사용자에게 표시하지 않음
    }
  };

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold">문의가 접수되었습니다!</h1>
          <p className="mb-6 text-gray-600">
            메시지가 성공적으로 전송되었습니다. 빠른 시일 내에 답변
            드리겠습니다.
          </p>
          <button
            onClick={() => {
              setIsSubmitted(false);
              setName('');
              setEmail('');
              setSubject('');
              setMessage('');
            }}
            className="rounded-lg bg-gradient-to-r from-gold-start to-gold-end px-6 py-2 text-white transition hover:bg-gradient-to-l"
          >
            새 문의하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">문의하기</h1>
        <p className="text-gray-600">
          궁금한 점이나 요청사항이 있으신가요? 언제든지 문의해 주세요.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* 연락처 정보 */}
        <div className="space-y-6 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">연락처 정보</h2>

          <div className="flex items-start gap-3">
            <Mail className="mt-1 h-5 w-5 text-gold-start" />
            <div>
              <p className="font-medium">이메일</p>
              <p className="text-gray-600">young-taek@naver.com</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MessageSquare className="mt-1 h-5 w-5 text-gold-start" />
            <div>
              <p className="font-medium">문의하기</p>
              <p className="text-gray-600">
                문의사항은 이 양식을 통해 연락주시면 빠르게 답변드리겠습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 문의 양식 */}
        <div className="md:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1 block font-medium">
                  이름
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block font-medium">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="mb-1 block font-medium">
                제목
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
                required
              />
            </div>

            <div>
              <label htmlFor="message" className="mb-1 block font-medium">
                메시지
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-gold-start focus:outline-none focus:ring-2 focus:ring-gold-start/20"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-gold-start to-gold-end py-3 font-medium text-white transition hover:bg-gradient-to-l disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? '전송 중...' : '메시지 보내기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
