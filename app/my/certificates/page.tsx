'use client';

import Button from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/Context';
import { CertificateModal } from '@/components/Course/CertificateModal';
import { COURSE_CATEGORIES } from '@/app/types/course/categories';
import { updateCertificate } from '@/utils/services/certificate/certificateService';
import { createClient } from '@/utils/supabase/client';
import { Award, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate } from '@/utils/helpers/formatDate';
import { Certificate } from '@/app/types/certificate/certificateTypes';
import { useCertificates } from '@/hooks/api/useCertificates';
import { useQueryClient } from '@tanstack/react-query';

export default function CertificatesPage() {
  const [userName, setUserName] = useState('사용자');
  const [selectedCertificate, setSelectedCertificate] =
    useState<Certificate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: certificates = [], isLoading } = useCertificates();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, nickname')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserName(
            profile.nickname || profile.name || user.email || '사용자'
          );
        }
      }
    };

    fetchUserProfile();
  }, []);

  const handleCertificateClick = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setIsModalOpen(true);
  };

  const handleRefresh = async (certificateId: number) => {
    // 수료증 갱신 로직
    try {
      const success = await updateCertificate(certificateId);
      if (success) {
        showToast('수료증이 갱신되었습니다.', 'success');

        queryClient.invalidateQueries({
          queryKey: ['certificates'],
        });
      } else {
        showToast('모든 강의를 완료해야 수료증을 갱신할 수 있습니다.', 'error');
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">수료증 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-bold">내 수료증</h1>

      {certificates.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <Award className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium text-gray-600">
            수료증이 없습니다
          </h3>
          <p className="text-gray-500">
            카테고리별 모든 강의를 완료하면 수료증이 발급됩니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((certificate) => (
            <div
              key={certificate.id}
              onClick={() => handleCertificateClick(certificate)}
              className="cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-all hover:shadow-md"
            >
              <div className="relative p-6">
                {/* 갱신 필요 표시 */}
                {certificate.is_outdated && (
                  <div className="absolute right-0 top-0 z-10 rounded-bl-lg bg-red-500 px-3 py-1 text-sm font-medium text-white">
                    갱신 필요
                  </div>
                )}

                <div className="mb-4 flex items-center justify-center">
                  <Award className="h-12 w-12 text-gold-start" />
                </div>

                <h3 className="mb-2 text-center text-lg font-bold">
                  {COURSE_CATEGORIES[
                    certificate.category as keyof typeof COURSE_CATEGORIES
                  ]?.title || certificate.category}
                  수료증
                </h3>

                <div className="mb-2 text-center text-sm text-gray-500">
                  <p>발급일: {formatDate(new Date(certificate.issued_at))}</p>
                  {certificate.updated_at && (
                    <p>
                      갱신일: {formatDate(new Date(certificate.updated_at))}
                    </p>
                  )}
                </div>

                <div className="flex justify-between gap-2">
                  {certificate.is_outdated && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefresh(certificate.id);
                      }}
                      className="flex flex-1 items-center justify-center gap-1 py-1 text-sm"
                    >
                      <RefreshCw className="h-4 w-4" />
                      갱신
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 수료증 모달 */}
      {selectedCertificate && (
        <CertificateModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            // 모달 닫힐 때 캐시 무효화
            queryClient.invalidateQueries({
              queryKey: ['certificates'],
            });
          }}
          userName={userName}
          categoryName={
            COURSE_CATEGORIES[
              selectedCertificate.category as keyof typeof COURSE_CATEGORIES
            ]?.title || selectedCertificate.category
          }
          completedCount={selectedCertificate.completed_courses?.length || 0}
          totalCount={selectedCertificate.completed_courses?.length || 0}
        />
      )}
    </div>
  );
}
