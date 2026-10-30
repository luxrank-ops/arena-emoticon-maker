import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'emoticon-images';

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다. (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 버킷 초기화 (최초 1회 실행)
 */
export async function ensureBucketExists() {
  const supabase = getSupabaseClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!exists) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });
  }
}

/**
 * 외부 URL 이미지 다운로드 후 Supabase에 업로드
 */
export async function uploadExternalImage(
  imageUrl: string,
  userId: string,
  generationId: string
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseClient();
  try {
    // 외부 이미지 다운로드
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`이미지 다운로드 실패: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 파일명 생성
    const timestamp = Date.now();
    const ext = imageUrl.includes('.png') ? 'png' : imageUrl.includes('.webp') ? 'webp' : 'jpg';
    const fileName = `${userId}/${generationId}/${timestamp}.${ext}`;

    // Supabase에 업로드
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      });

    if (error) throw error;

    // 공개 URL 생성
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      url: publicUrlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('이미지 업로드 실패:', error);
    throw new Error('이미지 저장 중 오류가 발생했습니다.');
  }
}

/**
 * 썸네일 생성 및 업로드 (Sharp 사용 시)
 * 현재는 원본을 썸네일로 사용
 */
export async function uploadThumbnail(
  imageUrl: string,
  userId: string,
  generationId: string
): Promise<string> {
  // TODO: Sharp로 리사이즈 후 업로드
  // 현재는 원본 URL 반환
  const result = await uploadExternalImage(imageUrl, userId, generationId);
  return result.url;
}

/**
 * 이미지 삭제
 */
export async function deleteImage(path: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.storage.from(BUCKET_NAME).remove([path]);
}

/**
 * 사용자별 이미지 목록 조회
 */
export async function listUserImages(userId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(userId, { limit: 100 });

  if (error) throw error;

  return data?.map(file => {
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`${userId}/${file.name}`);
    return urlData.publicUrl;
  }) || [];
}