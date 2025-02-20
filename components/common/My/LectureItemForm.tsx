import { LectureItemFormData } from '@/types/lectureFrom';
import { createClient } from '@/utils/supabase/client';
import { Upload, Video, X } from 'lucide-react';
import { ChangeEvent, useState } from 'react';

interface LectureItemFormProps {
  sectionIndex: number;
  itemIndex: number;
  item: LectureItemFormData;
  onUpdate: (
    sectionIndex: number,
    itemIndex: number,
    item: LectureItemFormData
  ) => void;
  onDelete: (sectionIndex: number, itemIndex: number) => void;
}

export function LectureItemForm({
  sectionIndex,
  itemIndex,
  item,
  onUpdate,
  onDelete,
}: LectureItemFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleVideoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      alert('파일 크기는 500MB를 초과할 수 없습니다.');
      return;
    }

    setVideoFile(file);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `lectures/videos/${fileName}`;

      console.log('Uploading file:', { fileName, filePath }); // 디버깅용

      // FileOptions 타입 명시적 정의
      const options: {
        cacheControl: string;
        upsert: boolean;
        onProgress?: (progress: { loaded: number; total: number }) => void;
      } = {
        cacheControl: '3600',
        upsert: false,
        onProgress: (progress) => {
          const percentage = (progress.loaded / progress.total) * 100;
          setUploadProgress(percentage);
        },
      };

      const { data, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, options);

      if (uploadError) throw uploadError;

      if (data) {
        const { data: urlData } = supabase.storage
          .from('videos')
          .getPublicUrl(filePath);

        console.log('File upload, updating item with URL:', urlData.publicUrl); // 디버깅용

        onUpdate(sectionIndex, itemIndex, {
          ...item,
          content_url: urlData.publicUrl,
          type: 'video',
          duration: '',
          orderNum: itemIndex + 1,
        });

        setUploadProgress(100);
      }
    } catch (error) {
      console.error('Video upload failed:', error);
      alert('동영상 업로드에 실패했습니다.');
      setVideoFile(null);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={item.title}
          onChange={(e) =>
            onUpdate(sectionIndex, itemIndex, {
              ...item,
              title: e.target.value,
            })
          }
          className="flex-1 rounded border p-2"
          placeholder="강의 제목"
        />
        <button
          type="button"
          onClick={() => onDelete(sectionIndex, itemIndex)}
          className="rounded-full p-1 text-red-500 hover:bg-red-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">콘텐츠 유형</label>
        <select
          value={item.type}
          onChange={(e) =>
            onUpdate(sectionIndex, itemIndex, {
              ...item,
              type: e.target.value as 'video' | 'text',
            })
          }
          className="w-full rounded border p-2"
        >
          <option value="video">동영상</option>
          <option value="text">텍스트</option>
        </select>
      </div>

      {item.type === 'video' && (
        <div>
          <label className="mb-2 block text-sm font-medium">
            동영상 업로드
          </label>
          {videoFile ? (
            <div className="rounded border p-4">
              <div className="mb-2 flex items-center gap-2">
                <Video className="h-5 w-5" />
                <span>{videoFile.name}</span>
              </div>
              {uploadProgress > 0 && (
                <div className="h-2 w-full rounded bg-gray-200">
                  <div
                    className="h-2 rounded bg-blue-500"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setVideoFile(null)}
                className="mt-2 text-sm text-red-500"
              >
                삭제
              </button>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
                id={`video-upload-${sectionIndex}-${itemIndex}`}
              />
              <label
                htmlFor={`video-upload-${sectionIndex}-${itemIndex}`}
                className="block cursor-pointer"
              >
                <span className="text-blue-500">클릭하여 업로드</span>
                <span className="text-gray-500">
                  {' '}
                  또는 파일을 여기에 드래그하세요
                </span>
                <p className="mt-1 text-sm text-gray-500">
                  최대 500MB, MP4 형식
                </p>
              </label>
            </div>
          )}
        </div>
      )}

      {item.type === 'text' && (
        <div>
          <label className="mb-2 block text-sm font-medium">내용</label>
          <textarea
            value={item.content_url || ''}
            onChange={(e) =>
              onUpdate(sectionIndex, itemIndex, {
                ...item,
                content_url: e.target.value,
              })
            }
            className="min-h-[100px] w-full rounded border p-2"
            placeholder="텍스트 내용을 입력하세요"
          />
        </div>
      )}
    </div>
  );
}
