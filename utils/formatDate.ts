/**
 * 날짜를 "YYYY년 MM월 DD일" 형식으로 포맷팅합니다.
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}년 ${month}월 ${day}일`;
}