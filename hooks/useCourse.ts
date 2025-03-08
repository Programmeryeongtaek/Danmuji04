'use client';

import { useToast } from '@/components/common/Toast/Context';
import { Course, CourseWithSections } from '@/types/course/courseModel';
import { fetchCourseDetail, fetchCourses, fetchCoursesByCategory, getLastAccessedItem, getUserCourseProgress, isAdminUser, markItemAsCompleted, } from '@/utils/services/courseService';
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
  const [ completedItems, setCompletedItems ] = useState<string[]>([]);
  const [lastAccessedItem, setLastAccessedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // 진행 상황 로드
  useEffect(() => {
    const loadProgress = async () => {
      try {
        setIsLoading(true);

        // 완료된 아이템 목록 조회
        const progressData = await getUserCourseProgress(courseId);
        setCompletedItems(
          progressData
            .filter(item => item.completed)
            .map(item => item.item_id)
        );

        // 마지막 접근 아이템 조회
        const lastItem = await getLastAccessedItem(courseId);
        setLastAccessedItem(lastItem);
      } catch (error) {
        console.error('코스 진행 상황 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [courseId]);

  // 아이템 완료 처리
  const markComplete = useCallback(async (itemId: string) => {
    try {
      // 이미 완료된 항목이면 스킵
      if (completedItems.includes(itemId)) {
        return true;
      }

      // DB에 완료 상태 저장
      await markItemAsCompleted(courseId, itemId);

      // 상태 업데이트
      setCompletedItems(prev => [...prev, itemId]);

      return true;
    } catch (error) {
      console.error('아이템 완료 처리 실패:', error);
      showToast('아이템 완료 처리 실패:', 'error');
      return false;
    }
  }, [courseId, completedItems, showToast]);

  return {
    completedItems,
    lastAccessedItem,
    isLoading,
    markComplete
  };
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