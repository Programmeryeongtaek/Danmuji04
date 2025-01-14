
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
  youtubeId: string;
}

export interface VideoPageProps {
  params: {
    slug: 'reading' | 'writing' | 'question';
    videoId: string;
  }
}

export interface VideoPlayerProps {
  youtubeId: string;
  onComplete?: () => void;
}

export interface WriteSectionProps {
  onSubmit?: (content: string) => void;
}

export interface YoutubeMock {
  id: string;
  title: string;
  youtubeId: string;
  duration: string;
  watched: boolean;
  hasWriting: boolean;
  description: string;
  keywords: string[];
}

export type YoutubeMocks = {
  [K in 'reading' | 'writing' | 'question']: YoutubeMock[];
}