// ─────────────────────────────────────────────────────────────
// 내 사진 바로 누끼 스티커 — 순수 로직 회귀 테스트
// 실행: npm run test:cutout
//  · 브라우저(캔버스·MediaPipe) 없이 명세·레이어·문구 데이터만 검증한다.
//  · 실제 누끼 품질은 라이브 브라우저 검증으로 확인한다.
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import {
  CUTOUT_CAPTION_MAX,
  CUTOUT_DEFAULT_OUTLINE,
  CUTOUT_MAX_OUTLINE,
  CUTOUT_MAX_PHOTOS,
  CUTOUT_POSITION_Y,
  CUTOUT_SIZE,
  CUTOUT_SUGGESTIONS,
  CUTOUT_SUGGESTION_COUNT,
  CUTOUT_ZIP_NAME,
  DEFAULT_CUTOUT_STYLE,
  calculateVideoDelayMs,
  calculateVideoSampleTimestamps,
  cutoutFileName,
  cutoutLayer,
  cutoutOrder,
  cutoutSeed,
  cutoutSpec,
  hasCaption,
} from '../src/lib/studio/photo-cutout';
import { MAX_LAYERS } from '../src/lib/studio/layers';
import { EMOTIONS } from '../src/lib/art/sticker';

let passed = 0;
function check(name: string, condition: boolean, extra = '') {
  assert.ok(condition, `${name}${extra ? ` — ${extra}` : ''}`);
  passed++;
  console.log(`ok  ${name}`);
}

const PHOTO = 'data:image/jpeg;base64,AAAA';

// ── 1. 상수·규격 ────────────────────────────────────────────
{
  check('출력 규격은 카카오와 같은 360px', CUTOUT_SIZE === 360);
  check('한 번에 12장까지', CUTOUT_MAX_PHOTOS === 12);
  check('외곽선 기본값은 범위 안', CUTOUT_DEFAULT_OUTLINE > 0 && CUTOUT_DEFAULT_OUTLINE <= CUTOUT_MAX_OUTLINE);
  check('문구 상한은 레이어와 같은 24자', CUTOUT_CAPTION_MAX === 24);
}

// ── 2. 사진만 있는 명세 (문구 없이) ────────────────────────
{
  const spec = cutoutSpec({ photo: PHOTO });
  check('사진 그대로 넣는다', spec.imageUrl === PHOTO);
  check('배경은 투명', spec.background === 'transparent');
  check('실사 스티커 톤을 쓴다', spec.tone === 'photo-sticker');
  check('문구가 없으면 글자 레이어도 없다', spec.textLayers === undefined);
  check('문구 없음을 판별', !hasCaption({ caption: '   ' }));
}

// ── 3. 문구가 있으면 캘리그라피 레이어 한 장 ───────────────
{
  const style = { caption: '  퇴근!!  ', emotion: 'joy' as const };
  const layer = cutoutLayer(style);
  check('레이어가 만들어진다', !!layer);
  check('앞뒤 공백을 지운다', layer?.text === '퇴근!!');
  check('기본 서체는 라운드(주아)', layer?.style === 'calli');
  check('가운데 정렬', layer?.x === 0.5);
  check('아래쪽 기본 위치', layer?.y === CUTOUT_POSITION_Y.bottom);
  check('데코는 자동이 기본', layer?.decor === 'auto');
  check('이펙트는 없음이 기본', layer?.effect === 'none');
  check('레이어 상한은 1장 이상', MAX_LAYERS >= 1);

  const spec = cutoutSpec({ photo: PHOTO, style, seed: 7 });
  check('명세에 레이어가 붙는다', (spec.textLayers?.length ?? 0) === 1);
  check('명세 레이어 문구가 그대로', spec.textLayers?.[0]?.text === '퇴근!!');
  check('명세 감정이 레이어 색을 정한다', spec.emotion === 'joy');
  check('문구가 있음을 판별', hasCaption({ caption: '퇴근!!' }));
}

// ── 4. 위쪽 배치 · 긴 문구 · 범위 밖 값 ────────────────────
{
  const top = cutoutLayer({ caption: '간식 내놔', position: 'top' });
  check('위쪽 배치는 y 를 올린다', top?.y === CUTOUT_POSITION_Y.top);
  check('아래·위 위치가 다르다', CUTOUT_POSITION_Y.top < CUTOUT_POSITION_Y.bottom);

  const long = cutoutLayer({ caption: '가'.repeat(60) });
  check('너무 긴 문구는 상한에서 자른다', (long?.text.length ?? 0) === CUTOUT_CAPTION_MAX);

  const huge = cutoutLayer({ caption: '크게', size: 0.9 });
  check('글자 크기는 상한으로 조인다', (huge?.size ?? 0) <= 0.34);
  const tiny = cutoutLayer({ caption: '작게', size: 0.001 });
  check('글자 크기는 하한으로 올린다', (tiny?.size ?? 0) >= 0.05);
  const blank = cutoutLayer({ caption: '   ' });
  check('공백만 있으면 레이어를 만들지 않는다', blank === null);
}

// ── 5. 시드·파일명 ─────────────────────────────────────────
{
  check('같은 id 는 같은 시드', cutoutSeed('cut-1') === cutoutSeed('cut-1'));
  check('다른 id 는 다른 시드', cutoutSeed('cut-1') !== cutoutSeed('cut-2'));
  check('시드는 양수', cutoutSeed('cut-1') > 0);
  check('순번은 2자리', cutoutOrder(0) === '01' && cutoutOrder(9) === '10' && cutoutOrder(11) === '12');
  check('파일명 규칙', cutoutFileName(0) === 'emotihak-cutout-01.png' && cutoutFileName(11) === 'emotihak-cutout-12.png');
  check('GIF 확장자 지원', cutoutFileName(0, 'gif') === 'emotihak-cutout-01.gif');
  check('ZIP 파일명', CUTOUT_ZIP_NAME.endsWith('.zip'));
  check('기본 모션은 none(정지)', DEFAULT_CUTOUT_STYLE.motion === 'none');
  const timestamps = calculateVideoSampleTimestamps(2.0, 12);
  check('동영상 12프레임 타임스탬프 계산', timestamps.length === 12 && timestamps[0] === 0 && timestamps[11] < 2.0);
  const delay = calculateVideoDelayMs(1.5, 12);
  check('동영상 딜레이 간격 계산 (60~140ms)', delay >= 60 && delay <= 140);
}

// ── 6. 추천 대사 (드립·밈 7테마 66줄) ──────────────────────
{
  check('테마 7개', CUTOUT_SUGGESTIONS.length === 7);
  check('추천 대사 66개', CUTOUT_SUGGESTION_COUNT === 66);
  const all = CUTOUT_SUGGESTIONS.flatMap((theme) => theme.lines);
  check('줄 수와 합계가 일치', all.length === CUTOUT_SUGGESTION_COUNT);
  const ids = new Set(all.map((line) => line.id));
  check('줄 id 가 모두 고유', ids.size === all.length);
  check('빈 문구가 없다', all.every((line) => line.line.trim().length > 0));
  check('앱 문구 상한(24자)을 넘지 않는다', all.every((line) => line.line.length <= CUTOUT_CAPTION_MAX));
  check('감정이 모두 유효', all.every((line) => !!EMOTIONS[line.emotion]));
  check('추천 문구는 레이어로도 잘린 채 들어가지 않는다', all.every((line) => cutoutLayer({ caption: line.line })?.text === line.line));
  check('테마마다 이모지·제목이 있다', CUTOUT_SUGGESTIONS.every((theme) => theme.emoji.length > 0 && theme.title.length > 0));
}

// ── 7. 명세는 저장 가능한 순수 객체 ───────────────────────
{
  const spec = cutoutSpec({ photo: PHOTO, style: { ...DEFAULT_CUTOUT_STYLE, caption: '생존 신고합니다' } });
  const round = JSON.parse(JSON.stringify(spec));
  check('JSON 왕복이 동일', JSON.stringify(round) === JSON.stringify(spec));
  check('사진 data URL 을 그대로 보존', round.imageUrl === PHOTO);
  check('레거시 line 필드는 비운다', round.line === '');
}

console.log(`\n✅ photo-cutout: ${passed} checks passed`);
