// 날짜를 "YYYY년 MM월 DD일" 형식으로 포맷팅
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}년 ${month}월 ${day}일`;
}

// ISO 날짜 문자열을 "YYYY년 MM월 DD일" 형식으로 변환
export function formatISODate(isoString: string): string {
  const date = new Date(isoString);
  return formatDate(date);
}

// 상대적 시간을 반환 (예: "3일 전", "방금 전")
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  
  return formatDate(date);
}