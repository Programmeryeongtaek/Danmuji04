import { CertificateCard } from '@/components/Course/CertificateCard';
import { useAllCertificates } from '@/hooks/useCertificate';
import { updateCertificate } from '@/utils/services/certificateService';
import { Award } from 'lucide-react';

interface CertificateListProps {
  userName: string;
}

export function CertificateList({ userName }: CertificateListProps) {
  const { certificates, isLoading, refetch } = useAllCertificates();

  const handleDownload = (certificateId: number) => {
    // 다운로드 로직 구현
    console.log(`수료증 ${certificateId} 다운로드 중...`);
    // 실제 구현에서는 서버에 요청하여 PDF 다운로드
    window.open(`/api/certificates/download/${certificateId}`, '_blank');
  };

  const handleRefresh = async (certificateId: number) => {
    // 수료증 갱신 로직
    const success = await updateCertificate(certificateId);
    if (success) {
      refetch();
    }
    return success;
  };

  if (isLoading) {
    return <div className="py-8 text-center">수료증 정보를 불러오는 중...</div>;
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
