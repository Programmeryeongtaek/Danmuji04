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

export function getTodayTimeOrDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  // 년, 월, 일이 같은지 확인 (오늘인지)
  const isToday = date.getDate() === now.getDate() &&
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear();
  
  if (isToday) {
    // 오늘 작성된 글이면 시:분 형식으로 표시
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false  // 24시간 형식 사용
    }).replace(/\s/g, ''); // 공백 제거
  } else {
    // 오늘이 아니면 연.월.일 형식으로 표시
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\s/g, ''); // 공백 제거
  }
}