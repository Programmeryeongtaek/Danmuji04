'use client';

import { userAtom } from '@/store/auth';
import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

export interface Certificate {
  id: number;
  user_id: string;
  category: string;
  issued_at: string;
  updated_at: string | null;
  is_outdated: boolean;
  completed_courses: string[];
}

export interface CertificateStats {
  totalCount: number;
  courseCount: number;
  lectureCount: number;
  recentCount: number; // 최근 30일 내 발급
  categoryCounts: Record<string, number>;
}

// 쿼리 키 팩토리
export const certificateKeys = {
  all: ['certificates'] as const,
  lists: () => [...certificateKeys.all, 'list'] as const,
  list: (userId: string, limit?: number) => [...certificateKeys.lists(), userId, limit] as const,
  details: () => [...certificateKeys.all, 'detail'] as const,
  detail: (certificateId: number) => [...certificateKeys.details(), certificateId] as const,
  stats: (userId: string) => [...certificateKeys.all, 'stats', userId] as const,
};

// 사용자 수료증 목록 조회
export const useCertificates = (limit?: number) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: certificateKeys.list(user?.id || '', limit),
    queryFn: async (): Promise<Certificate[]> => {
      if (!user) return [];

      const supabase = createClient();

      let query = supabase
        .from('certificates')
        .select(`
          id,
          user_id,
          category,
          issued_at,
          updated_at,
          is_outdated,
          completed_courses
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const { data: certificates, error: certificatesError } = await query;

      if (certificatesError) throw certificatesError;

      // completed_courses가 UUID 배열로 저장되어 있으므로 문자열 배열로 변환
      const certificatesWithCourses: Certificate[] = (certificates || []).map(cert => ({
        ...cert,
        completed_courses: cert.completed_courses || [],
        updated_at: cert.updated_at || null
      }));

      return certificatesWithCourses;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10분 - 수료증은 자주 변하지 않음
    gcTime: 60 * 60 * 1000,    // 1시간
  });
};

// 수료증 통계 조회
export const useCertificateStats = () => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: certificateKeys.stats(user?.id || ''),
    queryFn: async (): Promise<CertificateStats> => {
      if (!user) {
        return {
          totalCount: 0,
          courseCount: 0,
          lectureCount: 0,
          recentCount: 0,
          categoryCounts: {},
        };
      }

      const supabase = createClient();

      const { data: certificates, error } = await supabase
        .from('certificates')
        .select('category, course_id, lecture_id, issued_at')
        .eq('user_id', user.id)

      if (error) throw error;

      if (!certificates?.length) {
        return {
          totalCount: 0,
          courseCount: 0,
          lectureCount: 0,
          recentCount: 0,
          categoryCounts: {},
        };
      }

      const totalCount = certificates.length;
      const courseCount = totalCount;
      const lectureCount = 0;

      // 최근 30일 내 발급된 수료증 계산
      const thirtyDaysApp = new Date();
      thirtyDaysApp.setDate(thirtyDaysApp.getDate() - 30);
      const recentCount = certificates.filter(cert => 
        new Date(cert.issued_at) >= thirtyDaysApp
      ).length;

      // 카테고리별 개수 계산
      const categoryCounts: Record<string, number> = {};
      certificates.forEach(cert => {
        categoryCounts[cert.category] = (categoryCounts[cert.category] || 0) + 1;
      });

      return {
        totalCount,
        courseCount,
        lectureCount,
        recentCount,
        categoryCounts,
      };
    },
    enabled: !!user,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

// 특정 수료증 상세 조회
export const useCertificate = (certificateId: number) => {
  const user = useAtomValue(userAtom);

  return useQuery({
    queryKey: certificateKeys.detail(certificateId),
    queryFn: async (): Promise<Certificate | null> => {
      if (!user || !certificateId) return null;

      const supabase = createClient();

      const { data: certificate, error: certificateError } = await supabase
        .from('certificates')
        .select(`
          id,
          user_id,
          category,
          issued_at,
          updated_at,
          is_outdated,
          completed_courses
        `)
        .eq('id', certificateId)
        .eq('user_id', user.id) // 본인 수료증만 조회 가능
        .single();

      if (certificateError) {
        if (certificateError.code === 'PGRST116') return null; // Not found
        throw certificateError;
      }

      return {
        ...certificate,
        completed_courses: certificate.completed_courses || [],
        updated_at: certificate.updated_at || null
      };
    },
    enabled: !!user && !!certificateId,
    staleTime: 30 * 60 * 1000, // 개별 수료증은 변하지 않음
    gcTime: 2 * 60 * 60 * 1000,
  });
};

// 대시보드용 최근 수료증 (간소화된 정보)
export const useRecentCertificates = (limit: number = 3) => {
  const certificatesQuery = useCertificates(limit);
  
  return {
    ...certificatesQuery,
    data: certificatesQuery.data || [],
  };
};