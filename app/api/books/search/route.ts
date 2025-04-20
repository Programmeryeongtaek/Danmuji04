import { NextRequest, NextResponse } from 'next/server';
export interface AladinResponse {
  version: string;
  logo: string;
  title: string;
  link: string;
  pubDate: string;
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  query: string;
  searchCategoryId: number;
  searchCategoryName: string;
  item: AladinBookItem[];
  error?: string;
}

export interface AladinBookItem {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  cover: string;
  description?: string;
  link?: string;
  categoryName?: string;
  priceSales?: number;
  priceStandard?: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const ttbKey = process.env.ALADIN_TTB_KEY;

  if (!query) {
    return NextResponse.json({ error: '검색어를 입력해주세요' }, { status: 400 });
  }

  if (!ttbKey) {
    console.error('알라딘 API 키가 설정되지 않았습니다.');
    return NextResponse.json({ error: 'API 키 설정 오류' }, { status: 500 });
  }

  try {
    const apiUrl = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }
    
    const data = await response.json() as AladinResponse;

    return NextResponse.json(data);
  } catch (error) {
    console.error('도서 API 요청 실패:', error);
    return NextResponse.json({ error: '도서 정보를 가져오는데 실패했습니다' }, { status: 500 });
  }
}