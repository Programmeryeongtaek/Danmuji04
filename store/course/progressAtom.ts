import { createClient } from '@/utils/supabase/client';
import { atom } from 'jotai';

interface CourseProgressItem {
  completed: boolean;
  writingCompleted: boolean;
  completedItems: string[];
}

interface CourseProgressState {
  progressData: Record<string, CourseProgressItem>;
  isLoading: boolean;
}

const courseProgressStateAtom = atom<CourseProgressState>({
  progressData: {},
  isLoading: false,
});

// 읽기 전용
export const courseProgressAtom = atom((get) => get(courseProgressStateAtom));

// 초기화 (기존 useAllCourseProgress 사용)
export const initializeCourseProgressAtom = atom(
  null,
  async (get, set) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      set(courseProgressStateAtom, { progressData: {}, isLoading: false });
      return;
    }

    set(courseProgressStateAtom, prev => ({ ...prev, isLoading: true }));

    try {
      // 기존 useAllCourseProgress와 동일한 로직
      const { data: courses } = await supabase.from('courses').select('id');
      const { data: progress } = await supabase
        .from('course_progress')
        .select('course_id, item_id, completed')
        .eq('user_id', user.id);
      const { data: writings } = await supabase
        .from('course_writings')
        .select('course_id')
        .eq('user_id', user.id);
        
      const result: Record<string, CourseProgressItem> = {};
      
      courses?.forEach(course => {
        const courseProgress = progress?.filter(p => p.course_id === course.id) || [];
        const completedItems = courseProgress.filter(p => p.completed).map(p => p.item_id);
        
        result[course.id] = {
          completed: completedItems.length > 0,
          writingCompleted: writings?.some(w => w.course_id === course.id) || false,
          completedItems
        };
      });

      set(courseProgressStateAtom, { progressData: result, isLoading: false });
    } catch (error) {
      console.error('진행 상황 초기화 실패:', error);
      set(courseProgressStateAtom, prev => ({ ...prev, isLoading: false }));
    }
  }
);

// 아이템 완료 업데이트
export const updateItemCompletionAtom = atom(
  null,
  (get, set, courseId: string, itemId: string) => {
    const current = get(courseProgressStateAtom);
    const courseData = current.progressData[courseId] || {
      completed: false,
      writingCompleted: false,
      completedItems: []
    };

    const newCompletedItems = [...new Set([...courseData.completedItems, itemId])];

    set(courseProgressStateAtom, {
      ...current,
      progressData: {
        ...current.progressData,
        [courseId]: {
          ...courseData,
          completed: true,
          completedItems: newCompletedItems
        }
      }
    });
  }
);

// 글쓰기 완료 업데이트
export const updateWritingCompletionAtom = atom(
  null,
  (get, set, courseId: string, completed: boolean) => {
    const current = get(courseProgressStateAtom);
    const courseData = current.progressData[courseId] || {
      completed: false,
      writingCompleted: false,
      completedItems: []
    };
    
    set(courseProgressStateAtom, {
      ...current,
      progressData: {
        ...current.progressData,
        [courseId]: {
          ...courseData,
          writingCompleted: completed
        }
      }
    });
  }
);