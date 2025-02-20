import { useToast } from '@/components/common/Toast/Context';
import { LectureFormData, LectureSectionFormData } from '@/types/lectureFrom';
import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';

export function useLectureForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const { showToast } = useToast();

  const uploadThumbnail = async (file: File): Promise<string> => {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `thumbnails/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const createLecture = async (formData: LectureFormData, sections: LectureSectionFormData[]) => {
    try {
      setIsSubmitting(true);
      const supabase = createClient();

      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 사용자 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, nickname')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error('프로필 정보를 찾을 수 없습니다.');

      // instructor 필드에는 사용자의 이름이나 닉네임을 사용
      const instructorName = profile.nickname || profile.name;

      // 썸네일 업로드
      let thumbnailUrl = formData.thumbnail_url;
      if (thumbnail) {
        thumbnailUrl = await uploadThumbnail(thumbnail);
      }

      // 강의 생성
      const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .insert({
        title: formData.title,
        thumbnail_url: thumbnailUrl,
        category: formData.category,
        instructor: instructorName,
        depth: formData.depth,
        keyword: formData.keyword,
        group_type: formData.group_type,
        is_public: formData.is_public,
        is_free: formData.is_free,
        price: formData.is_free ? 0 : formData.price,
        students: 0,
        likes: 0
      })
      .select()
      .single();

      if (lectureError) throw lectureError;

      // sections가 배열인지 확인
    if (!Array.isArray(sections)) {
      throw new Error('sections must be an array');
    }

       // 각 섹션에 대해 처리
    for (const section of sections) {
      console.log('Processing section:', section);  // 디버깅

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

      // items가 배열인지 확인하고 데이터가 있는지 확인
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

        console.log('Inserting items:', itemInserts);  // 디버깅

        const { error: itemsError } = await supabase
          .from('lecture_items')
          .insert(itemInserts);

        if (itemsError) throw itemsError;
      }
    }

      showToast('강의가 성공적으로 등록되었습니다.', 'success');
      return lecture;

    } catch (error) {
      console.error('강의 등록 실패:', error);
      showToast('강의 등록에 실패했습니다.', 'error');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLecture = async (
    lectureId: number,
    formData: LectureFormData,
    sections: LectureSectionFormData[]
  ) => {
    try {
      setIsSubmitting(true);
      const supabase = createClient();
  
      let thumbnailUrl = formData.thumbnail_url;
      if (thumbnail) {
        thumbnailUrl = await uploadThumbnail(thumbnail);
      }
  
      // 강의 정보 업데이트
      const { error: lectureError } = await supabase
        .from('lectures')
        .update({
          title: formData.title,
          thumbnail_url: thumbnailUrl,
          category: formData.category,
          instructor: formData.instructor,
          depth: formData.depth,
          keyword: formData.keyword,
          group_type: formData.group_type,
          is_public: formData.is_public,
          is_free: formData.is_free,
          price: formData.price
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
  
        if (section.items.length > 0) {
          const itemInserts = section.items.map(item => ({
            section_id: sectionData.id,
            title: item.title,
            type: item.type,
            content_url: item.content_url,
            duration: item.duration,
            order_num: item.orderNum
          }));
  
          const { error: itemsError } = await supabase
            .from('lecture_items')
            .insert(itemInserts);
  
          if (itemsError) throw itemsError;
        }
      }
  
      showToast('강의가 성공적으로 수정되었습니다.', 'success');
    } catch (error) {
      console.error('강의 수정 실패:', error);
      showToast('강의 수정에 실패했습니다.', 'error');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };
  

  return {
    isSubmitting,
    thumbnail,
    setThumbnail,
    createLecture,
    updateLecture  
  };
}