import { CertificateCard } from '@/components/Course/CertificateCard';
import { useCertificates } from '@/hooks/api/useCertificates';
import { updateCertificate } from '@/utils/services/certificate/certificateService';
import { useQueryClient } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { useToast } from '../common/Toast/Context';

interface CertificateListProps {
  userName: string;
}

export function CertificateList({ userName }: CertificateListProps) {
  const { data: certificates = [], isLoading } = useCertificates();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const handleDownload = (certificateId: number) => {
    // 실제 구현에서는 서버에 요청하여 PDF 다운로드
    window.open(`/api/certificates/download/${certificateId}`, '_blank');
  };

  const handleRefresh = async (certificateId: number) => {
    try {
      const success = await updateCertificate(certificateId);
      if (success) {
        showToast('수료증이 갱신되었습니다.', 'success');

        queryClient.invalidateQueries({
          queryKey: ['certificates'],
        });
      } else {
        showToast('수료증 갱신에 실패했습니다.', 'error');
      }
      return success;
    } catch (error) {
      console.error('Error refreshing certificate:', error);
      showToast('수료증 갱신에 실패했습니다.', 'error');
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">수료증 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <Award className="mx-auto mb-4 h-16 w-16 text-gray-300" />
        <h3 className="mb-2 text-lg font-medium text-gray-600">
          수료증이 없습니다
        </h3>
        <p className="text-gray-500">
          카테고리별 모든 강의를 완료하면 수료증이 발급됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {certificates.map((certificate) => (
        <CertificateCard
          key={certificate.id}
          certificate={certificate}
          userName={userName}
          onRefresh={() => handleRefresh(certificate.id)}
          onDownload={() => handleDownload(certificate.id)}
        />
      ))}
    </div>
  );
}
