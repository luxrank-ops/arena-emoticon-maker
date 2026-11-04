const SIZE = 512;
const MAX_BYTES = 900_000;

let _webpSupported: boolean | null = null;

async function checkWebpSupport(): Promise<boolean> {
  if (_webpSupported !== null) return _webpSupported;
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const blob = await canvas.convertToBlob({ type: 'image/webp' });
    _webpSupported = blob.type === 'image/webp';
  } catch { _webpSupported = false; }
  return _webpSupported;
}

export async function encodeWebpClient(input: ArrayBuffer | Blob, opts: { kind?: 'sheet' | 'frame'; pixelArt?: boolean; kakaoSize?: number } = {}): Promise<Uint8Array> {
  const blob = input instanceof Blob ? input : new Blob([input]);
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const targetSize = opts.kind === 'frame' ? (opts.kakaoSize ?? 360) : SIZE;
  const canvas = new OffscreenCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetSize, targetSize);
  const scale = Math.min(targetSize / bitmap.width, targetSize / bitmap.height);
  const drawW = Math.round(bitmap.width * scale);
  const drawH = Math.round(bitmap.height * scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, Math.round((targetSize - drawW) / 2), Math.round((targetSize - drawH) / 2), drawW, drawH);
  if (opts.kind === 'frame' && !opts.pixelArt) sharpenCanvas(ctx, targetSize, targetSize);
  const useWebp = await checkWebpSupport();
  const mimeType = useWebp ? 'image/webp' : 'image/png';
  if (opts.kind === 'frame') {
    const outBlob = await canvas.convertToBlob({ type: mimeType, ...(useWebp ? { quality: 1.0 } : {}) });
    const arr = new Uint8Array(await outBlob.arrayBuffer());
    if (arr.length > MAX_BYTES) throw new Error('Image too large.');
    return arr;
  }
  let quality = 0.86;
  let outBlob = await canvas.convertToBlob({ type: mimeType, quality });
  let arr = new Uint8Array(await outBlob.arrayBuffer());
  while (arr.length > MAX_BYTES && quality > 0.55) {
    quality -= 0.10;
    outBlob = await canvas.convertToBlob({ type: mimeType, quality });
    arr = new Uint8Array(await outBlob.arrayBuffer());
  }
  return arr;
}

function sharpenCanvas(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0, ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += src[((y + ky) * width + (x + kx)) * 4 + c] * kernel[ki++];
          }
        }
        dst[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum));
      }
    }
  }
  ctx.putImageData(new ImageData(dst, width, height), 0, 0);
}

export function uint8ToBase64(data: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    const slice = data.subarray(i, Math.min(i + chunk, data.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
