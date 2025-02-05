import { createClient } from '@/utils/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    
    if (!token_hash || !type) {
      console.error('Missing token_hash or type')
      return NextResponse.redirect(new URL('/', request.url))
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (error) {
      console.error('Auth verification error:', error)
      // 이메일 인증 실패시 홈페이지로 리다이렉트
      return NextResponse.redirect(new URL('/auth/confirm/authError', request.url))
    }

    // 인증 성공시 홈페이지로 리다이렉트
    return NextResponse.redirect(new URL('/', request.url))
    
  } catch (error) {
    console.error('Unexpected error during auth confirmation:', error)
    // 예상치 못한 에러가 발생해도 홈페이지로 리다이렉트
    return NextResponse.redirect(new URL('/auth/confirm/authError', request.url))
  }
}