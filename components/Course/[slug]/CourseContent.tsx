'use client';

import { CourseItem } from '@/types/course/courseType';
import { Check, Play } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import ProgressBar from './ProgressBar';

const CourseContent = ({ category }: { category: string }) => {
  const [courseItems, setCourseItems] = useState<CourseItem[]>([
    {
      id: '1',
      title: '첫 번째 강의',
      duration: '10:00',
      watched: true,
      hasWriting: true,
      youtubeId: 'YOUTUBE_ID_1',
    },
    {
      id: '2',
      title: '두 번째 강의',
      duration: '15:00',
      watched: true,
      hasWriting: false,
      youtubeId: 'YOUTUBE_ID_2',
    },
  ]);

  const completedCount = courseItems.reduce(
    (count, item) => count + (item.watched && item.hasWriting ? 1 : 0),
    0
  );

  const isCompleted = (item: CourseItem) => item.watched && item.hasWriting;

  return (
    <div>
      <div className="mb-6">
        <ProgressBar current={completedCount} total={courseItems.length} />
      </div>

      {courseItems.map((item) => (
        <Link
          href={`/course/${category}/${item.id}`}
          key={item.id}
          className="flex justify-between"
        >
          <div className="flex items-center">
            {isCompleted(item) ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <Play className="h-5 w-5 text-gray-600" />
            )}
            <div className="flex flex-col">
              <span>{item.title}</span>
              <span>{item.duration}</span>
            </div>
          </div>
          <div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                item.watched
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.watched ? '시청 완료' : '미시청'}
            </span>
            <span
              className={`rounded-full text-sm ${
                item.hasWriting
                  ? 'bg-gold-start text-gray-700'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.hasWriting ? '글쓰기 완료' : '글쓰기'}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default CourseContent;
