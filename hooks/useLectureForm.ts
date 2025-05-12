'use client';

import { useCallback, useState } from 'react';
import useSupabase from './useSupabase';
import { useForm } from './useForm';
import { LectureFormData, LectureSectionFormData } from '@/app/types/knowledge/lectureForm';

export function useLectureForm() {
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const { supabase, user } = useSupabase();
  const { isSubmitting, uploadFile, handleSubmit } = useForm();

  const createLecture = useCallback(async (formData: LectureFormData, sections: LectureSectionFormData[]) => {
    return handleSubmit(async (data: LectureFormData) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      // 사용자 프로필 정보 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('프로필 정보를 찾을 수 없습니다.');

      // 강사명 설정
      const instructorName = profile.nickname || profile.name || '';

      // 썸네일 업로드
      let thumbnailUrl = data.thumbnail_url;
      if (thumbnail) {
        thumbnailUrl = await uploadFile({
          bucket: 'videos',
          path: 'thumbnails',
          file: thumbnail
        });
      }

      // 강의 생성
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .insert({
          title: data.title,
          thumbnail_url: thumbnailUrl,
          category: data.category,
          instructor: instructorName,
          depth: data.depth,
          keyword: data.keyword,
          group_type: data.group_type,
          is_public: data.is_public,
          is_free: data.is_free,
          price: data.is_free ? 0 : data.price,
          students: 0,
          likes: 0
        })
        .select()
        .single();

      if (lectureError) throw lectureError;

      // 각 섹션에 대해 처리
      for (const section of sections) {
        // 섹션 생성
        const { data: sectionData, error: sectionError } = await supabase
          .from('lecture_sections')
          .insert({
            lecture_id: lecture.id,
            title: section.title,
            order_num: section.orderNum
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // items가 배열인지 확인하고 데이터가 있는지 확인 (쉼표 위치 수정)
        if (Array.isArray(section.items) && section.items.length > 0) {
          // 각 아이템의 필수 필드가 있는지 확인
          const itemInserts = section.items.map((item, index) => ({
            section_id: sectionData.id,
            title: item.title || '',
            type: item.type || 'video',
            content_url: item.content_url || '',
            duration: item.duration || '',
            order_num: item.orderNum || (index + 1)
          }));

          const { error: itemsError } = await supabase
            .from('lecture_items')
            .insert(itemInserts);

          if (itemsError) throw itemsError;
        }
      }

      return lecture;
    }, formData, '강의가 성공적으로 등록되었습니다.', '강의 등록에 실패했습니다.');
  }, [handleSubmit, supabase, thumbnail, uploadFile, user]);

  const updateLecture = useCallback(async (
    lectureId: number,
    formData: LectureFormData,
    sections: LectureSectionFormData[]
  ) => {
    return handleSubmit(async (data: LectureFormData) => {
      if (!user) throw new Error('로그인이 필요합니다.');
      
      let thumbnailUrl = data.thumbnail_url;
      if (thumbnail) {
        thumbnailUrl = await uploadFile({
          bucket: 'videos',
          path: 'thumbnails',
          file: thumbnail
        });
      }
  
      // 강의 정보 업데이트
      const { error: lectureError } = await supabase
        .from('lectures')
        .update({
          title: data.title,
          thumbnail_url: thumbnailUrl,
          category: data.category,
          instructor: data.instructor,
          depth: data.depth,
          keyword: data.keyword,
          group_type: data.group_type,
          is_public: data.is_public,
          is_free: data.is_free,
          price: data.price
        })
        .eq('id', lectureId);
  
      if (lectureError) throw lectureError;
  
      // 기존 섹션과 아이템 삭제
      const { error: deleteError } = await supabase
        .from('lecture_sections')
        .delete()
        .eq('lecture_id', lectureId);
  
      if (deleteError) throw deleteError;
  
      // 새로운 섹션과 아이템 생성
      for (const section of sections) {
        const { data: sectionData, error: sectionError } = await supabase
          .from('lecture_sections')
          .insert({
            lecture_id: lectureId,
            title: section.title,
            order_num: section.orderNum
          })
          .select()
          .single();
  
        if (sectionError) throw sectionError;
  
        if (section.items && Array.isArray(section.items) && section.items.length > 0) {
          const itemInserts = section.items.map((item, index) => ({
            section_id: sectionData.id,
            title: item.title || '',
            type: item.type || 'video',
            content_url: item.content_url || '',
            duration: item.duration || '',
            order_num: item.orderNum || (index + 1)
          }));
  
          const { error: itemsError } = await supabase
            .from('lecture_items')
            .insert(itemInserts);
  
          if (itemsError) throw itemsError;
        }
      }
  
      return true;
    }, formData, '강의가 성공적으로 수정되었습니다.', '강의 수정에 실패했습니다.');
  }, [handleSubmit, supabase, thumbnail, uploadFile, user]);

  return {
    isSubmitting,
    thumbnail,
    setThumbnail,
    createLecture,
    updateLecture
  };
}