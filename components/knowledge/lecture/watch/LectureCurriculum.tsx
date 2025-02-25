'use client';

import { LectureItem, LectureSection } from '@/types/lectureFrom';
import { ChevronDown, ChevronUp, FileText, Play, Video } from 'lucide-react';
import { useState } from 'react';

interface LectureCurriculumProps {
  sections: LectureSection[];
  currentItemId: number;
  onItemSelect: (item: LectureItem) => void;
}

export default function LectureCurriculum({
  sections,
  currentItemId,
  onItemSelect,
}: LectureCurriculumProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<number, boolean>
  >(
    // 기본적으로 모든 섹션을 펼침
    sections.reduce(
      (acc, section) => {
        acc[section.id] = true;
        return acc;
      },
      {} as Record<number, boolean>
    )
  );

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <div className="divide-y rounded-lg border">
      {sections.map((section) => (
        <div key={section.id} className="overflow-hidden">
          {/* 섹션 헤더 */}
          <div
            className="flex cursor-pointer items-center justify-between bg-gray-50 p-4"
            onClick={() => toggleSection(section.id)}
          >
            <div className="font-medium">{section.title}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {section.lecture_items?.length || 0}개 강의
              </span>
              {expandedSections[section.id] ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          </div>

          {/* 섹션 콘텐츠 (강의 아이템들) */}
          {expandedSections[section.id] && section.lecture_items && (
            <div className="divide-y bg-white">
              {section.lecture_items.map((item) => (
                <div
                  key={item.id}
                  className={`flex cursor-pointer items-center p-4 hover:bg-gray-50 ${
                    currentItemId === item.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onItemSelect(item)}
                >
                  <div className="mr-3">
                    {currentItemId === item.id ? (
                      <Play className="h-5 w-5 text-blue-500" />
                    ) : item.type === 'video' ? (
                      <Video className="h-5 w-5 text-gray-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.duration && (
                      <div className="text-xs text-gray-500">
                        {item.duration}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
