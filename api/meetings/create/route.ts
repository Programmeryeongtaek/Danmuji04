import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface MeetingRequest {
  provider: 'zoom' | 'google';
  studyId: string;
  topic: string;
  duration?: number; // 회의 시간(분)
}

export async function POST(request: NextRequest) {
  try {
    // 요청 바디 파싱
    const body: MeetingRequest = await request.json();
    
    // 필수 필드 검증
    if (!body.provider || !body.studyId || !body.topic) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    // 사용자 인증 확인
    // 🔴 주의: cookies() 함수는 매개변수를 받지 않으며, 반환값은 직접 사용하지 않음
    // cookies() 함수를 호출하더라도 그 반환값을 사용하지 않음
    cookies();
    
    // 🔴 주의: createClient() 함수도 매개변수 없이 사용
    const supabase = createClient();
    
    // 세션 가져오기
    const { data } = await supabase.auth.getSession();
    
    // 🔴 주의: data에서 session 추출 시 변수명 충돌 방지
    const session = data.session;
    
    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    // 회의 생성 (제공업체에 따라 다른 API 호출)
    if (body.provider === 'zoom') {
      // 🔴 주의: userId 매개변수 사용 시 유의
      return await createZoomMeeting(body, session.user.id);
    } else if (body.provider === 'google') {
      return await createGoogleMeeting(body, session.user.id);
    } else {
      return NextResponse.json({ error: '지원하지 않는 회의 제공업체입니다.' }, { status: 400 });
    }
  } catch (error) {
    console.error('회의 생성 실패:', error);
    return NextResponse.json(
      { error: '회의 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * Zoom 회의 생성
 * 
 * 🔴 주의사항:
 * 1. meeting 매개변수는 함수 내에서 사용해야 lint 경고가 발생하지 않음
 * 2. userId 매개변수를 사용하지 않을 경우 _ 로 대체 가능
 */
async function createZoomMeeting(meeting: MeetingRequest, userId: string) {
  // userId 매개변수는 이 함수에서 직접 사용하지 않지만, 
  // 데이터베이스에 회의 정보 저장 시 필요할 수 있음
  // 사용하지 않을 경우 _userId로 변경하거나 주석 처리 가능
  
  const zoomApiKey = process.env.ZOOM_API_KEY;
  const zoomApiSecret = process.env.ZOOM_API_SECRET;
  const zoomAccountId = process.env.ZOOM_ACCOUNT_ID;
  
  if (!zoomApiKey || !zoomApiSecret || !zoomAccountId) {
    console.error('Zoom API 설정이 누락되었습니다.');
    return NextResponse.json(
      { error: 'Zoom API 설정이 누락되었습니다.' },
      { status: 500 }
    );
  }

  try {
    // 여기서는 Zoom API의 Server-to-Server OAuth 인증을 사용
    // JWT 토큰 발급 (실제 구현 시 Zoom 문서 참조)
    const tokenResponse = await fetch(`https://zoom.us/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${zoomApiKey}:${zoomApiSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        'grant_type': 'account_credentials',
        'account_id': zoomAccountId
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Zoom 토큰 획득 실패: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Zoom 회의 생성 요청
    const meetingResponse = await fetch(`https://api.zoom.us/v2/users/me/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        topic: meeting.topic, // meeting 매개변수 사용
        type: 2, // 예약된 회의
        duration: meeting.duration || 60,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          waiting_room: false,
          use_pmi: false
        }
      })
    });

    if (!meetingResponse.ok) {
      throw new Error(`Zoom 회의 생성 실패: ${meetingResponse.status}`);
    }

    const meetingData = await meetingResponse.json();

    // 여기서 userId를 사용하여 데이터베이스에 회의 정보 저장 가능
    // 예: await saveZoomMeetingToDatabase(meetingData.id, userId, meeting.studyId);

    // 응답 반환
    return NextResponse.json({
      provider: 'zoom',
      join_url: meetingData.join_url,
      start_url: meetingData.start_url,
      password: meetingData.password,
      meeting_id: meetingData.id,
    });
  } catch (error) {
    console.error('Zoom 회의 생성 실패:', error);
    return NextResponse.json(
      { error: 'Zoom 회의 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * Google Meet 회의 생성
 * 
 * 🔴 주의사항:
 * 1. meeting 매개변수는 함수 내에서 사용해야 lint 경고가 발생하지 않음
 * 2. userId 매개변수를 사용하지 않을 경우 _ 로 대체 가능
 */
async function createGoogleMeeting(meeting: MeetingRequest, userId: string) {
  // 실제 구현에서는 Google Calendar API를 사용하여 구현
  // 여기서는 더미 데이터 반환
  
  try {
    // NOTE: 실제 구현 시 Google OAuth 인증 및 Calendar API 호출 필요
    // Google Calendar API를 사용한 실제 구현 예시:
    /*
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // 서비스 계정 또는 사용자 토큰으로 인증
    // ...
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // 캘린더 이벤트 생성
    const event = {
      summary: meeting.topic,
      description: `스터디 ID: ${meeting.studyId}`,
      start: {
        dateTime: new Date().toISOString(),
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: new Date(Date.now() + (meeting.duration || 60) * 60000).toISOString(),
        timeZone: 'Asia/Seoul',
      },
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(2),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };
    
    const result = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      resource: event,
    });
    
    const meetingLink = result.data.conferenceData.entryPoints[0].uri;
    */
    
    // 더미 데이터 반환
    const meetingId = `meet-${Date.now()}`;
    const meetingCode = Math.random().toString(36).substring(2, 8);
    
    // 여기서 userId를 사용하여 데이터베이스에 회의 정보 저장 가능
    // 예: await saveGoogleMeetingToDatabase(meetingId, userId, meeting.studyId);
    
    return NextResponse.json({
      provider: 'google',
      join_url: `https://meet.google.com/${meetingCode}`,
      start_url: `https://meet.google.com/${meetingCode}`,
      meeting_id: meetingId
    });
  } catch (error) {
    console.error('Google Meet 회의 생성 실패:', error);
    return NextResponse.json(
      { error: 'Google Meet 회의 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}