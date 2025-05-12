import { Certificate } from '@/app/types/certificate/certificateTypes';
import { getAllCertificates } from '@/utils/services/certificate/certificateService';
import { useEffect, useState } from 'react';

export function useAllCertificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await getAllCertificates();
        setCertificates(data);
      } catch (err) {
        console.error('수료증 목록 조회 실패:', err);
        const error = err instanceof Error ? err : new Error('수료증 목록을 불러오는데 실패했습니다.');
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  const refetch = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getAllCertificates();
      setCertificates(data);
    } catch (err) {
      console.error('수료증 목록 새로고침 실패:', err);
      const error = err instanceof Error ? err : new Error('수료증 목록을 새로고침하는데 실패했습니다.');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    certificates,
    isLoading,
    error,
    refetch
  };
}