import { useToast } from '@/components/common/Toast/Context';

export const useTimeLimit = (hours: number) => {
  const { showToast } = useToast();

  const checkTimeLimit = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > hours) {
      showToast(`작성 후 ${hours}시간이 지나 수정할 수 없습니다.`, 'info');
      return false;
    }
    
    return true;
  };

  return { checkTimeLimit };
};