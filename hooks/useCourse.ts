'use client';

import { useToast } from '@/components/common/Toast/Context';
import { Course, CourseWithSections } from '@/app/types/course/courseModel';
import { fetchCourseDetail, fetchCourses, fetchCoursesByCategory, fetchUserCoursesProgress, getUserCourseProgress, getUserWritingStatus, isAdminUser, markCourseCompleted, markItemAsCompleted, markWritingCompleted } from '@/utils/services/courseService';
import { useCallback, useEffect, useState } from 'react';

// 코스 목록 조회를 위한 훅
export function useCourseList(category?: string) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setIsLoading(true);
        let data: Course[];

        if (category) {
          data = await fetchCoursesByCategory(category);
        } else {
          data = await fetchCourses();
        }

        setCourses(data);
      } catch (error) {
        console.error('코스 목록 로드 실패:', error);
        showToast('코스 목록을 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourses();
  }, [category, showToast]);

  return { courses, isLoading };
}

// 코스 상세 정보 조회를 위한 훅
export function useCourseDetail(courseId: string) {
  const [course, setCourse] = useState<CourseWithSections | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const loadCourseDetail = async () => {
      try {
        setIsLoading(true);
        const data= await fetchCourseDetail(courseId);
        setCourse(data);
      } catch (error) {
        console.error('코스 상세 정보 로드 실패:', error);
        showToast('코스 상세 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourseDetail();
  }, [courseId, showToast]);

  return { course, isLoading };
}

// 코스 진행 상황 관리를 위한 훅
export function useCourseProgress(courseId: string) {
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasWriting, setHasWriting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // 진행 상황 로드
  useEffect(() => {
    const loadProgress = async () => {
      try {
        setIsLoading(true);

        // 1. 완료된 아이템 목록 조회
        const progressData = await getUserCourseProgress(courseId);
        const completedItemIds = progressData
          .filter(item => item.completed)
          .map(item => item.item_id);
        
        setCompletedItems(completedItemIds);

        // 2. 코스가 완료되었는지 확인 (하나 이상의 아이템이 완료됨)
        setIsCompleted(completedItemIds.length > 0);
        
        // 3. 글쓰기 완료 여부 확인
        const writingStatus = await getUserWritingStatus(courseId);
        setHasWriting(writingStatus);
      } catch (error) {
        console.error('코스 진행 상황 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      loadProgress();
    }
  }, [courseId]);

  // 아이템 완료 처리
  const markComplete = useCallback(async (itemId: string) => {
    try {
      // 이미 완료된 항목이면 스킵
      if (completedItems.includes(itemId)) {
        return true;
      }

      // DB에 완료 상태 저장
      const success = await markItemAsCompleted(courseId, itemId);

      if (success) {
        // 상태 업데이트
        setCompletedItems(prev => [...prev, itemId]);
        setIsCompleted(true);
        return true;
      }

      return true;
    } catch (error) {
      console.error('아이템 완료 처리 실패:', error);
      showToast('아이템 완료 처리 실패:', 'error');
      return false;
    }
  }, [courseId, completedItems, showToast]);

  // 전체 코스 완료 처리
  const completeAllItems = useCallback(async () => {
    try {
      const success = await markCourseCompleted(courseId);
      
      if (success) {
        showToast('코스 학습이 완료되었습니다!', 'success');
        setIsCompleted(true);
        
        // 코스 상세 정보를 다시 불러와서 모든 아이템 ID 가져오기
        const courseData = await fetchCourseDetail(courseId);
        const allItemIds = courseData.sections.flatMap((section: { items: Array<{ id: string }> }) => 
          section.items.map((item: { id: string }) => item.id)
        );

        setCompletedItems(allItemIds);
        return true;
      }

      return false;
    } catch (error) {
      console.error('코스 완료 처리 실패:', error);
      showToast('코스 완료 처리에 실패했습니다:', 'error');
      return false;
    }
  }, [courseId, showToast]);

  // 글쓰기 완료 처리
  const completeWriting = useCallback(async (content: string) => {
    try {
      const success = await markWritingCompleted(courseId, content);

      if (success) {
        setHasWriting(true);
        showToast('글쓰기가 저장되었습니다!', 'success');
        return true;
      }

      return false;
    } catch (error) {
      console.error('글쓰기 완료 처리 실패:', error);
      showToast('글쓰기 저장에 실패했습니다.', 'error');
      return false;
    }
  }, [courseId, showToast]);

  return {
    completedItems,
    isCompleted,
    hasWriting,
    isLoading,
    markComplete,
    completeAllItems,
    completeWriting
  };
}

// 모든 코스의 진행 상황을 한번에 가져오는 훅
export function useAllCourseProgress() {
  const [progressData, setProgressData] = useState<Record<string, { 
    completed: boolean, 
    writingCompleted: boolean 
  }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllProgress = async () => {
      try {
        setIsLoading(true);
        const data = await fetchUserCoursesProgress();
        setProgressData(data);
      } catch (error) {
        console.error('진행 상황 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllProgress();
  }, []);

  return { progressData, isLoading };
}

// 사용자 권한 확인을 위한 훅
export function useCoursePermission() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setIsLoading(true);
        const adminStatus = await isAdminUser();
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('권한 확인 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, []);

  return { isAdmin, isLoading };
}