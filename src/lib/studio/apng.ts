// ─────────────────────────────────────────────────────────────
// APNG 조립기 (브라우저 전용 의존성 없음)
//  · 각 프레임을 canvas.toBlob('image/png') 로 만든 뒤, 그 PNG 청크를 그대로 옮겨
//    acTL/fcTL/fdAT 만 덧붙여 애니메이션 PNG 를 만든다 (재압축 없음 → 화질 손실 없음).
//  · 카카오·라인 이모티콘 스튜디오가 받는 애니메이션 형식(APNG/GIF) 중 하나를 채운다.
//  · 순수 함수라 Node 테스트에서 실제 바이트로 검증한다.
// ─────────────────────────────────────────────────────────────

export const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export interface PngChunk {
  type: string;
  data: Uint8Array;
}

export interface PngHeader {
  width: number;
  height: number;
  bitDepth: number;
  /** 6 = RGBA, 2 = RGB, 3 = 팔레트 */
  colorType: number;
  interlace: number;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 8) & 0xff;
  target[offset + 1] = value & 0xff;
}

export function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

export function parsePngChunks(png: Uint8Array): PngChunk[] {
  if (!isPng(png)) throw new Error('APNG: PNG 서명이 아닙니다');
  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = readUint32(png, offset);
    const type = String.fromCharCode(png[offset + 4], png[offset + 5], png[offset + 6], png[offset + 7]);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > png.length) break;
    chunks.push({ type, data: png.subarray(start, end) });
    offset = end + 4;
    if (type === 'IEND') break;
  }
  return chunks;
}

export function readPngHeader(png: Uint8Array): PngHeader {
  const ihdr = parsePngChunks(png).find((chunk) => chunk.type === 'IHDR');
  if (!ihdr || ihdr.data.length < 13) throw new Error('APNG: IHDR 이 없습니다');
  return {
    width: readUint32(ihdr.data, 0),
    height: readUint32(ihdr.data, 4),
    bitDepth: ihdr.data[8],
    colorType: ihdr.data[9],
    interlace: ihdr.data[12],
  };
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  writeUint32(out, 0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out, 4, 8 + data.length);
  writeUint32(out, 8 + data.length, crc);
  return out;
}

function acTL(frames: number, plays: number): Uint8Array {
  const data = new Uint8Array(8);
  writeUint32(data, 0, frames);
  writeUint32(data, 4, plays);
  return chunk('acTL', data);
}

function fcTL(
  sequence: number,
  width: number,
  height: number,
  delayMs: number,
  disposeOp = 1,
  blendOp = 0,
): Uint8Array {
  const data = new Uint8Array(26);
  writeUint32(data, 0, sequence);
  writeUint32(data, 4, width);
  writeUint32(data, 8, height);
  writeUint32(data, 12, 0);
  writeUint32(data, 16, 0);
  const delay = Math.max(1, Math.min(65535, Math.round(delayMs)));
  writeUint16(data, 20, delay);
  writeUint16(data, 22, 1000);
  data[24] = disposeOp;
  data[25] = blendOp;
  return chunk('fcTL', data);
}

function fdAT(sequence: number, frameData: Uint8Array): Uint8Array {
  const data = new Uint8Array(4 + frameData.length);
  writeUint32(data, 0, sequence);
  data.set(frameData, 4);
  return chunk('fdAT', data);
}

/** 모든 프레임은 같은 크기·같은 RGBA 형식이어야 한다. */
export function assembleApng(
  frames: Uint8Array[],
  delayMs: number | number[],
  options: { plays?: number } = {},
): Uint8Array {
  if (frames.length === 0) throw new Error('APNG: 프레임이 없습니다');
  const header = readPngHeader(frames[0]);
  if (header.colorType !== 6) throw new Error('APNG: 알파 채널(RGBA) PNG 프레임이 필요합니다');
  const delays = Array.isArray(delayMs)
    ? delayMs
    : frames.map(() => delayMs);

  const out: Uint8Array[] = [PNG_SIGNATURE];
  const ihdr = parsePngChunks(frames[0]).find((c) => c.type === 'IHDR')!;
  out.push(chunk('IHDR', ihdr.data));
  out.push(acTL(frames.length, options.plays ?? 0));

  let sequence = 0;
  for (const [index, frame] of frames.entries()) {
    const frameHeader = readPngHeader(frame);
    if (frameHeader.width !== header.width || frameHeader.height !== header.height) {
      throw new Error('APNG: 프레임 크기가 다릅니다');
    }
    if (frameHeader.colorType !== header.colorType) {
      throw new Error('APNG: 프레임 색 형식이 다릅니다');
    }
    out.push(fcTL(sequence++, header.width, header.height, delays[index] ?? 80));
    const idat = parsePngChunks(frame).filter((c) => c.type === 'IDAT');
    if (idat.length === 0) throw new Error('APNG: IDAT 이 없습니다');
    for (const part of idat) {
      if (index === 0) out.push(chunk('IDAT', part.data));
      else out.push(fdAT(sequence++, part.data));
    }
  }
  out.push(chunk('IEND', new Uint8Array(0)));

  const total = out.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of out) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

/** APNG 여부 (acTL 청크 존재) */
export function isApng(bytes: Uint8Array): boolean {
  try {
    return parsePngChunks(bytes).some((c) => c.type === 'acTL');
  } catch {
    return false;
  }
}

/** APNG 프레임 수 (acTL 기준) */
export function apngFrameCount(bytes: Uint8Array): number {
  try {
    const actl = parsePngChunks(bytes).find((c) => c.type === 'acTL');
    return actl ? readUint32(actl.data, 0) : 1;
  } catch {
    return 0;
  }
}
