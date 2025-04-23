import { YoutubeMocks } from '@/app/types/course/courseType';

export const mockCourses: YoutubeMocks = {
  reading: [
    {
      id: '1',
      title: '효과적인 독서법',
      youtubeId: 'dQw4w9WgXcQ',
      duration: '10:45',
      watched: false,
      hasWriting: false,
      description: '독서를 더 효과적으로 하는 방법을 배워봅시다.',
      keywords: ['독서법', '집중력', '이해력']
    },
    {
      id: '2',
      title: '책 읽기의 즐거움',
      youtubeId: 'YbJOTdZBX1g',
      duration: '12:30',
      watched: false,
      hasWriting: false,
      description: '독서가 주는 즐거움과 장점에 대해 알아봅니다.',
      keywords: ['독서의 즐거움', '독서 습관', '자기계발']
    },
    {
      id: '3',
      title: '독서 노트 작성법',
      youtubeId: 'M7lc1UVf-VE',
      duration: '15:20',
      watched: false,
      hasWriting: false,
      description: '효과적인 독서 노트 작성 방법을 알아봅니다.',
      keywords: ['독서 노트', '정리법', '기록']
    }
  ],
  writing: [],
  question: []
};