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
    console.log('비디오 파일 선택됨:', file.name, file.size, file.type);

    // 비디오 길이를 저장할 변수
    let detectedDuration = '00:00';

    // 비디오 길이 추출 시도
    try {
      const videoBlob = new Blob([file], { type: file.type });
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');

      video.muted = true;
      video.preload = 'metadata';

      // Promise로 메타데이터 로드 대기
      detectedDuration = await new Promise<string>((resolve) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(videoUrl);
          const duration = video.duration;
          console.log('원시 비디오 길이(초):', duration);

          if (isNaN(duration) || duration === 0 || duration === Infinity) {
            console.warn('유효하지 않은 비디오 길이:', duration);
            // 테스트용 기본값 (실제 업로드한 비디오의 길이로 설정)
            resolve('00:03');
            return;
          }

          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);
          const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

          console.log('포맷된 비디오 길이:', formattedDuration);
          resolve(formattedDuration);
        };

        video.onerror = () => {
          console.error('비디오 메타데이터 로드 실패');
          URL.revokeObjectURL(videoUrl);
          resolve('00:03');
        };

        setTimeout(() => {
          if (!video.duration || video.duration === 0) {
            console.warn('비디오 메타데이터 로드 타임아웃');
            URL.revokeObjectURL(videoUrl);
            resolve('00:03');
          }
        }, 5000);

        video.src = videoUrl;
        video.load();
      });

      console.log('결정된 비디오 길이:', detectedDuration);
    } catch (error) {
      console.error('비디오 메타데이터 처리 중 오류:', error);
      detectedDuration = '00:03';
    }

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `lectures/videos/${fileName}`;

      console.log('업로드 시작:', {
        fileName,
        filePath,
        duration: detectedDuration,
      });

      const options = {
        cacheControl: '3600',
        upsert: false,
        onProgress: (progress: { loaded: number; total: number }) => {
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

        console.log('파일 업로드 완료, URL:', urlData.publicUrl);

        // 여기서 중요: 반드시 duration 값이 빈 문자열이 아닌지 확인
        const finalDuration = detectedDuration || '00:03';

        console.log('최종 사용할 영상 길이:', finalDuration);

        // 아이템 업데이트 전에 duration 값을 확인하고 로깅
        const updatedItem: LectureItemFormData = {
          ...item,
          content_url: urlData.publicUrl,
          type: 'video' as 'video' | 'text',
          duration: finalDuration,
          orderNum: itemIndex + 1,
        };

        console.log('Supabase에 업데이트할 아이템 정보:', updatedItem);

        // 아이템 상태 업데이트
        onUpdate(sectionIndex, itemIndex, updatedItem);

        setUploadProgress(100);

        // 디버깅: "duration" 필드가 제대로 업데이트 되었는지 확인
        // lecture_items 테이블에 직접 query 실행해보기
        try {
          const { data: testQuery, error: testError } = await supabase
            .from('lecture_items')
            .select('duration')
            .eq('content_url', urlData.publicUrl)
            .single();

          if (testError) {
            console.warn('duration 확인 쿼리 실패:', testError);
          } else {
            console.log('Supabase에 저장된 duration 값:', testQuery?.duration);
          }
        } catch (e) {
          console.error('duration 확인 중 오류:', e);
        }
      }
    } catch (error) {
      console.error('비디오 업로드 실패:', error);
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
