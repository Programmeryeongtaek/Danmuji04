import { Book, BookFormData, BookWithStudyCount } from '@/app/types/book/bookTypes';
import { requireAuth } from '@/utils/supabase/auth';
import { createClient } from '@/utils/supabase/client';

// 모든 도서 목록을 조회
export async function fetchBooks(): Promise<BookWithStudyCount[]> {
  const supabase = createClient();
  
  try {
    // 기본 도서 데이터 조회
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // 각 도서에 대한 스터디 수 조회 및 추가
    const booksWithStudyCount = await Promise.all(
      data.map(async (book) => {
        try {
          const { count } = await supabase
            .from('studies')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', book.id);
          
          return {
            ...book,
            study_count: count ?? 0
          };
        } catch (countError) {
          console.error(`도서 ${book.id}의 스터디 수 조회 실패:`, countError);
          return {
            ...book,
            study_count: 0
          };
        }
      })
    );

    return booksWithStudyCount;
  } catch (error) {
    console.error('도서 목록 조회 실패:', error);
    return [];
  }
}

// 단일 도서 정보 조회
export async function fetchBookById(bookId: string): Promise<(Book & { study_count: number }) | null> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // 도서를 찾을 수 없는 경우
      throw error;
    }

    // 도서에 대한 스터디 수 가져오기
    try {
      const { count: studyCount } = await supabase
        .from('studies')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', bookId);

      return {
        ...data,
        study_count: studyCount ?? 0
      };
    } catch (countError) {
      console.error('스터디 수 조회 실패:', countError);
      // 오류가 발생해도 도서 정보는 반환
      return data;
    }
  } catch (error) {
    console.error('도서 상세 조회 실패:', error);
    return null;
  }
}

// ISBN으로 도서 정보를 조회
export async function fetchBookByISBN(isbn: string): Promise<Book | null> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('isbn', isbn)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('ISBN으로 도서 조회 실패:', error);
    return null;
  }
}

// 도서 정보를 저장하거나 업데이트
export async function saveBook(bookData: BookFormData, userId: string): Promise<Book> {
  const supabase = createClient();

  try {
    // 이미 등록된 도서인지 확인
    const existingBook = await fetchBookByISBN(bookData.isbn);

    if (existingBook) {
      // 기존 도서 정보 업데이트
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
          recommendation_count: 0, // 초기 추천 수
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('도서 저장 중 오류:', error);
    throw error;
  }
}

// 도서 추천 토클 (추천/추천 취소)
export async function toggleBookRecommendation(bookId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await requireAuth();

    // 이미 추천했는지 확인
    const { data: existingRecommendation } = await  supabase
      .from('book_recommendations')
      .select('id')
      .eq('book_id', bookId)
      .eq('user_id', user.id)
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
      // 추천
      const { error: insertError } = await supabase
        .from('book_recommendations')
        .insert({
          book_id: bookId,
          user_id: user.id,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // 추천 수 증가
      const { error: updateError } = await supabase.rpc(
        'increment_book_recommendation',
        { book_id: bookId }
      );

      if (updateError) throw updateError;

      return true; // 추천 수 증가
    }
  } catch (error) {
    console.error('추천 토글 실패:', error);
    throw error;
  }
}

// 인기 도서 목록 조회 (추천 수 기준)
export async function fetchPopularBooks(limit: number = 5): Promise<BookWithStudyCount[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('recommendation_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // 각 도서에 대한 스터디 수 조회 및 추가
    const bookWithStudyCount = await Promise.all(
      data.map(async (book) => {
        try {
          const { count } = await supabase
            .from('studies')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', book.id);

          return {
            ...book,
            study_count: count ?? 0
          };
        } catch (countError) {
          console.error(`도서 ${book.id}의 스터디 수 조회 실패:`, countError);
          return {
            ...book,
            study_count: 0
          };
        }
      })
    );

    return bookWithStudyCount;
  } catch (error) {
    console.error('인기 도서 목록 조회 실패:', error);
    return [];
  }
}

// 비슷한 도서 추천
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
        .neq('author', book.author)
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