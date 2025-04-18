import { createClient } from '../supabase/client';

// 도서 정보 타입 정의
export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string;
  isbn: string;
  publisher: string;
  publication_date: string;
  rating: number;
  recommendation_count: number;
  created_by: string | null;
  created_at: string;
}

export interface BookFormData {
  title: string;
  author: string;
  description: string;
  isbn: string;
  publisher: string;
  publication_date: string;
  cover_url?: string | null;
}

// 모든 도서 목록 조회
export async function fetchBooks(): Promise<Book[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 단일 도서 정보 조회
export async function fetchBookById(bookId: string): Promise<Book | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // 도서를 찾을 수 없는 경우
    throw error;
  }

  return data;
}

// ISBN으로 도서 정보 조회 (이미 등록된 도서인지 확인용)
export async function fetchBookByISBN(isbn: string): Promise<Book | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('isbn', isbn)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// 도서 정보 저장/업데이트
export async function saveBook(bookData: BookFormData, userId: string): Promise<Book> {
  const supabase = createClient();

  
  // 이미 등록된 도서인지 확인 
  // TODO: 하지만 동일 도서로 스터디를 진행할 수도 있으니 중복으로 등록 가능하도록 할지도 검토 필요
  const existingBook = await fetchBookByISBN(bookData.isbn);

  if (existingBook) {
    // 기존 도서 정보 업데이트 (추천 수 등은 변경하지 않음)
    const { data, error } = await supabase
      .from('books')
      .update({
        title: bookData.title,
        author: bookData.author,
        description: bookData.description,
        publisher: bookData.publisher,
        publication_date: bookData.publication_date,
        cover_url: bookData.cover_url || existingBook.cover_url
      })
      .eq('id', existingBook.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // 새 도서 등록
    const { data, error } = await supabase
      .from('books')
      .insert({
        title: bookData.title,
        author: bookData.author,
        description: bookData.description,
        isbn: bookData.isbn,
        publisher: bookData.publisher,
        publication_date: bookData.publication_date,
        cover_url: bookData.cover_url,
        rating: 0, // 초기 평점
        recommendation_count: 0, // 초기 추천 수
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// 도서 추천 토글 (추천/추천 취소)
export async function toggleBookRecommendation(bookId: string, userId: string): Promise<boolean> {
  const supabase = createClient();

  // 이미 추천했는지 확인
  const { data: existingRecommendation } = await supabase
    .from('book_recommendations')
    .select('id')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (existingRecommendation) {
    // 추천 취소
    const { error: deleteError } = await supabase
      .from('book_recommendations')
      .delete()
      .eq('id', existingRecommendation.id);

    if (deleteError) throw deleteError;

    // 추천 수 감소
    const { error: updateError } = await supabase.rpc(
      'decrement_book_recommendation',
      { book_id: bookId }
    );

    if (updateError) throw updateError;

    return false; // 추천이 취소됨
  } else {
    // 추천 추가
    const { error: insertError } = await supabase
      .from('book_recommendations')
      .insert({
        book_id: bookId,
        user_id: userId,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    // 추천 수 증가
    const { error: updateError } = await supabase.rpc(
      'increment_book_recommendation',
      { book_id: bookId }
    );

    if (updateError) throw updateError;

    return true; // 추천이 추가됨
  }
}

// 인기 도서 목록 조회 (추천 수 기준)
export async function fetchPopularBooks(limit: number = 5): Promise<Book[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('recommendation_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// 사용자가 추천한 도서 목록 조회
export async function fetchUserRecommendedBooks(userId: string): Promise<Book[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('book_recommendation')
    .select('book_id')
    .eq('user_id', userId);

  if (error) throw error;

  if (!data || data.length === 0) return [];

  const bookIds = data.map(item => item.book_id);

  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('*')
    .in('id', bookIds)
    .order('created_at', { ascending: false });

  if (booksError) throw booksError;
  return books || [];
}

// 알라딘 API로부터 가져온 도서 정보 저장
export async function createBookFromAladin(
  bookData: {
    title: string;
    author: string;
    description: string;
    isbn: string;
    publisher: string;
    publication_date: string;
    cover_url: string | null;
  },
  userId: string
): Promise<Book> {
  const supabase = createClient();

  // 이미 등록된 도서인지 확인
  const existingBook = await fetchBookByISBN(bookData.isbn);

  if (existingBook) {
    // 기존 도서 정보만 반환
    return existingBook;
  } else {
    // 새 도서 등록
    const { data, error } = await supabase
      .from('books')
      .insert({
        title: bookData.title,
        author: bookData.author,
        description: bookData.description,
        isbn: bookData.isbn,
        publisher: bookData.publisher,
        publication_date: bookData.publication_date,
        cover_url: bookData.cover_url,
        rating: 0, // 초기 평점
        recommendation_count: 0, // 초기 추천 수
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// 비슷한 도서 추천 (ISBN 기준)
export async function fetchSimilarBooks(isbn: string, limit: number = 5): Promise<Book[]> {
  try {
    const book = await fetchBookByISBN(isbn);
    if (!book) return [];

    const supabase = createClient();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .neq('id', book.id)
      .eq('author', book.author)
      .limit(limit);
    
    if (error) throw error;

    // 같은 저자의 책이 부족하면 다른 기준으로 추가 검색
    if (data.length < limit) {
      const remainingCount = limit - data.length;
      const { data: moreBooks, error: moreError } = await supabase
        .from('books')
        .select('*')
        .neq('id', book.id)
        .eq('author', book.author)
        .order('recommendation_count', { ascending: false })
        .limit(remainingCount);

      if (!moreError && moreBooks) {
        return [...data, ...moreBooks];
      }
    }

    return data || [];
  } catch (error) {
    console.error('비슷한 도서 추천 실패:', error);
    return [];
  }
}