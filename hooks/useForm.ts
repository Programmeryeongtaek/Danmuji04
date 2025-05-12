'use client';

import { useToast } from '@/components/common/Toast/Context';
import { useCallback, useState } from 'react';
import useSupabase from './useSupabase';

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
}

export interface FormHookOptions {
  toastSuccess?: boolean;
  toastError?: boolean;
}

export function useForm(options: FormHookOptions = { toastSuccess: true, toastError: true }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { supabase, user } = useSupabase();

  // 파일 업로드 함수
  const uploadFile = useCallback(async ({ bucket, path, file }: UploadOptions): Promise<string> => {
    if (!file) throw new Error('파일이 선택되지 않았습니다.');

    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${path}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }, [supabase]);

  //제출 래퍼 함수 - 로딩 상태 관리 및 오류 처리
  const handleSubmit = useCallback(async <T, R>(
    submitFn: (data: T) => Promise<R>,
    data: T,
    successMessage?: string,
    errorMessage?: string
  ): Promise<R | null> => {
    if (!user && !errorMessage) {
      errorMessage = '로그인이 필요합니다.';
    }

    if (isSubmitting) return null;
    
    setIsSubmitting(true);
    try {
      const result = await submitFn(data);
      
      if (successMessage && options.toastSuccess) {
        showToast(successMessage, 'success');
      }
      
      return result;
    } catch (error) {
      console.error('제출 실패:', error);
      
      const errorMsg = errorMessage || 
        (error instanceof Error ? error.message : '오류가 발생했습니다.');
      
      if (options.toastError) {
        showToast(errorMsg, 'error');
      }
      
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, options.toastError, options.toastSuccess, showToast, user]);

  return {
    isSubmitting,
    uploadFile,
    handleSubmit
  };
}