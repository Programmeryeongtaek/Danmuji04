import { ReactNode } from 'react';

export interface BasicCourseProps {
  children?: ReactNode;
}

export interface CourseItem {
  id: string;
  title: string;
  duration: string;
  watched: boolean;
  hasWriting: boolean;
  videoUrl?: string;
}

export interface VideoPageProps {
  param: {
    slug: 'reading' | 'writing' | 'question';
    videoId: string;
  }
}

export interface VideoPlayerProps {
  videoUrl: string;
  onComplete?: () => void;
}

export interface WriteSectionProps {
  videoId: string;
  onSubmit?: (content: string) => void;
}