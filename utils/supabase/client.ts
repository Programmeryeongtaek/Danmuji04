import { createBrowserClient } from '@supabase/ssr'

interface EnrollmentResponse {
  data: { status: string } | null;
  error: Error | null;
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Anon Key')
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
}

// 강의 관련 함수들
export async function fetchLectures() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function searchLectures(query: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .or(
      `title.ilike.%${query}%,keyword.ilike.%${query}%`
    )

  if (error) throw error;
  return data;
}

// 카테고리별 강의 조회
export async function fetchLecturesByCategory(category: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// 수강평 관련 함수들 추가
export async function fetchReviewsByLectureId(lectureId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, profiles:user_id (role )`)
    .eq('lecture_id', lectureId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getActiveEnrollment(
  lectureId: number, 
  userId: string 
): Promise<EnrollmentResponse> {
  const supabase = createClient();
  return await supabase
    .from('enrollments')
    .select('status')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .single();
}

export async function insertEnrollment(lectureId: number, userId: string) {
  const supabase = createClient();
  return await supabase
    .from('enrollments')
    .insert({
      lecture_id: lectureId,
      user_id: userId,
      status: 'active',
      payment_status: 'free'
    });
}

export async function updateEnrollmentStatus(lectureId: number, userId: string, status: 'active' | 'cancelled') {
  const supabase = createClient();
  return await supabase
    .from('enrollments')
    .update({ status })
    .eq('lecture_id', lectureId)
    .eq('user_id', userId);
}

export async function getExistingReview(lectureId: number, userId: string) {
  const supabase = createClient();
  return await supabase
    .from('reviews')
    .select('id')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .maybeSingle();
}

export async function insertReview(lectureId: number, userId: string, rating: number, content: string) {
  const supabase = createClient();
  return await supabase
    .from('reviews')
    .insert({
      lecture_id: lectureId,
      user_id: userId,
      rating,
      content,
      is_active: true
    })
    .select()
    .single();
}

export async function getActiveEnrollmentCount(lectureId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('id')
    .eq('lecture_id', lectureId)
    .eq('status', 'active');

  if (error) throw error;
  return data?.length || 0;
}

export async function updateLectureStudentCount(lectureId: number, count: number) {
  const supabase = createClient();
  return await supabase
    .from('lectures')
    .update({ students: count })
    .eq('id', lectureId);
}

// 기본 함수들을 조합하여 더 복잡한 작업을 수행하는 함수를 생성성
export async function enrollLecture(lectureId: number) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('로그인이 필요합니다.');
  }

  // 수강 신청
  const { error: enrollError } = await insertEnrollment(lectureId, user.id);
  if (enrollError) {
    throw enrollError;
  }

  // 수강생 수 업데이트
  const count = await getActiveEnrollmentCount(lectureId);
  await updateLectureStudentCount(lectureId, count);
}

export async function createReview(lectureId: number, rating: number, content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  // 수강 상태 확인
  const { data: enrollment } = await getActiveEnrollment(lectureId, user.id);
  if (!enrollment) throw new Error('수강 중인 강의만 수강평을 작성할 수 있습니다.');

  // 기존 리뷰 확인
  const { data: existingReview } = await getExistingReview(lectureId, user.id);
  if (existingReview) throw new Error('이미 수강평을 작성하였습니다.');

  // 리뷰 작성
  return await insertReview(lectureId, user.id, rating, content);
}

// 유료 강의 체크
export async function isFreeLecture(lectureId: number): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('price')
    .eq('id', lectureId)
    .single();

  if (error) throw error;
  return data?.price === 0;
}

// 수강 취소
export async function cancelEnrollment(lectureId: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  // 무료 강의 여부 체크
  const isFree = await isFreeLecture(lectureId);
  if (!isFree) throw new Error('무료 강의만 취소할 수 있습니다.');

  // 수강 상태 확인
  const { data: enrollment } = await getActiveEnrollment(lectureId, user.id);
  if (!enrollment) throw new Error('수강 중인 강의가 아닙니다.');

  // 수강 취소
  const { error } = await updateEnrollmentStatus(lectureId, user.id, 'cancelled');
  if (error) throw error;

  // 수강생 수 업데이트
  const count = await getActiveEnrollmentCount(lectureId);
  await updateLectureStudentCount(lectureId, count);
}

// 평균 별점 가져오기
export async function fetchAverageRating(lectureId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('lecture_id', lectureId);

  if (error) throw error;

  if (!data || data.length === 0 ) return 0;

  const average = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
  return parseFloat(average.toFixed(1));
}

// 사용자의 리뷰 존재 여부 확인
export async function hasUserReviewed(lectureId: number, userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('lecture_id', lectureId)
    .eq('user_id', userId)
    .single();

  // error.code가 'PGRST116'인 경우 = 리뷰를 찾을 수 없음 = 사용자가 아직 리뷰를 작성하지 않음
  // 이는 실제 에러가 아니므로 무시하고 false를 반환

  // 그 외의 에러(DB 연결 실패 등)는 실제 에러이므로 throw
  if (error && error.code !== 'PGRST116') throw error;
  return !!data; // 데이터가 있으면 true, 없으면 false
}