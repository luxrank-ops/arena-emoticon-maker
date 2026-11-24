// ─────────────────────────────────────────────────────────────
// 숏폼 동영상 / 연속 클립 프레임 추출기 (브라우저 온디바이스)
//  · 사용자가 올린 1~3초 짧은 동영상(MP4/MOV/WebM)에서 12프레임 내외를 추출한다.
//  · 서버로 동영상을 보내지 않고 브라우저 HTML5 Video + Canvas 안에서만 처리한다.
// ─────────────────────────────────────────────────────────────

import {
  CUTOUT_PHOTO_SIDE,
  CUTOUT_VIDEO_DEFAULT_FRAMES,
  CUTOUT_VIDEO_MAX_DURATION,
  calculateVideoDelayMs,
  calculateVideoSampleTimestamps,
  type CutoutCrop,
} from '@/lib/studio/photo-cutout';

export interface ExtractedVideoClip {
  /** 800×800 정사각 JPEG data URL 배열 */
  frames: string[];
  duration: number;
  delayMs: number;
  width: number;
  height: number;
}

export function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith('video/')) return true;
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.3gp')
  );
}

/**
 * 브라우저 환경에서 동영상 파일로부터 정사각 프레임들을 추출한다.
 */
export async function extractVideoFrames(
  file: File,
  options: {
    maxFrames?: number;
    crop?: CutoutCrop;
    maxDurationSeconds?: number;
    onProgress?: (current: number, total: number) => void;
  } = {},
): Promise<ExtractedVideoClip> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('extractVideoFrames is only supported in browser environments');
  }

  const crop = options.crop ?? 'face';
  const maxFrames = Math.max(2, Math.min(options.maxFrames ?? CUTOUT_VIDEO_DEFAULT_FRAMES, 16));
  const maxDur = options.maxDurationSeconds ?? CUTOUT_VIDEO_MAX_DURATION;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    // 1) 비디오 메타데이터 로드
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('동영상을 불러올 수 없습니다. 지원되는 MP4, MOV, WebM 파일로 시도해 주세요.'));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('동영상 로딩 시간이 초과되었습니다.'));
      }, 10_000);

      function cleanup() {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      }

      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
      video.src = objectUrl;
      video.load();
    });

    const duration = Math.min(video.duration || 1.5, maxDur);
    const timestamps = calculateVideoSampleTimestamps(duration, maxFrames);
    const delayMs = calculateVideoDelayMs(duration, maxFrames);

    const vw = video.videoWidth || 800;
    const vh = video.videoHeight || 800;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) * (crop === 'face' ? 0.32 : 0.5);

    const canvas = document.createElement('canvas');
    canvas.width = CUTOUT_PHOTO_SIDE;
    canvas.height = CUTOUT_PHOTO_SIDE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D Context 를 생성하지 못했습니다.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const frames: string[] = [];

    // 2) 타임스탬프별 시킹 및 캡처
    for (let i = 0; i < timestamps.length; i++) {
      const time = timestamps[i];
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = Math.min(time, Math.max(0, video.duration - 0.05));
      });

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CUTOUT_PHOTO_SIDE, CUTOUT_PHOTO_SIDE);
      ctx.drawImage(video, sx, sy, side, side, 0, 0, CUTOUT_PHOTO_SIDE, CUTOUT_PHOTO_SIDE);
      frames.push(canvas.toDataURL('image/jpeg', 0.9));

      options.onProgress?.(i + 1, timestamps.length);
    }

    return {
      frames,
      duration,
      delayMs,
      width: CUTOUT_PHOTO_SIDE,
      height: CUTOUT_PHOTO_SIDE,
    };
  } finally {
    video.src = '';
    URL.revokeObjectURL(objectUrl);
  }
}
