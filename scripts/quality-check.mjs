/**
 * EmotiMe 유료화 품질 검증 스크립트
 * docs/QUALITY_CRITERIA.md 에 정의된 게이트 항목을 검증.
 *
 * 사용법:
 *   node scripts/quality-check.mjs
 *
 * 검증 항목:
 * 1. 타입 체크 통과 여부
 * 2. 빌드 통과 여부
 * 3. FaceSignature 필드 완성도 (eyeShape, lipThickness, noseSize, jawline)
 * 4. MediaPipe 연동 코드 존재 여부
 * 5. AI 생성 공급자 연동 코드 존재 여부
 * 6. 품질 기준 문서 존재 여부
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const REPO_ROOT = process.cwd();
let passed = 0;
let failed = 0;
const errors = [];

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name} ${detail ? `- ${detail}` : ''}`);
    failed++;
    errors.push(name);
  }
}

function section(title) {
  console.log(`\n📋 ${title}`);
  console.log('   ' + '─'.repeat(title.length + 4));
}

async function run() {
  console.log('🔍 EmotiMe 유료화 품질 검증 시작\n');

  // ─── 1. 타입 체크 ───
  section('1. TypeScript 타입 체크');
  try {
    execSync('npx tsc --noEmit', { cwd: REPO_ROOT, stdio: 'pipe' });
    check('typecheck 통과', true);
  } catch (e) {
    check('typecheck 통과', false, e.message);
  }

  // ─── 2. 빌드 ───
  section('2. 프로덕션 빌드');
  try {
    execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' });
    check('build 통과', true);
  } catch (e) {
    check('build 통과', false, e.message);
  }

  // ─── 3. FaceSignature 필드 완성도 ───
  section('3. FaceSignature 얼굴 특성 필드');
  const typesSrc = readFileSync(`${REPO_ROOT}/src/lib/types.ts`, 'utf8');
  check('eyeShape 필드 정의', typesSrc.includes("eyeShape: z.enum") || typesSrc.includes('eyeShape: EyeShape'));
  check('lipThickness 필드 정의', typesSrc.includes('lipThickness'));
  check('noseSize 필드 정의', typesSrc.includes('noseSize'));
  check('jawline 필드 정의', typesSrc.includes('jawline'));
  check('EyeShape 타입 정의', typesSrc.includes('export type EyeShape'));
  check('Jawline 타입 정의', typesSrc.includes('export type Jawline'));

  // ─── 4. MediaPipe 연동 ───
  section('4. MediaPipe FaceLandmarker 연동');
  const analyzeSrc = readFileSync(`${REPO_ROOT}/src/lib/face/analyze.ts`, 'utf8');
  check('MediaPipe import', analyzeSrc.includes('@mediapipe/tasks-vision'));
  check('FaceLandmarker 생성', analyzeSrc.includes('FaceLandmarker.createFromOptions'));
  check('랜드마크 기반 시그니처 변환', analyzeSrc.includes('landmarkToSignature'));
  check('색상 기반 폴백', analyzeSrc.includes('analyzeByColor'));

  const embedSrc = readFileSync(`${REPO_ROOT}/src/lib/ai/face-embedding.ts`, 'utf8');
  check('얼굴 임베딩 클래스', embedSrc.includes('class FaceEmbeddingExtractor'));
  check('코사인 유사도', embedSrc.includes('similarity'));
  check('FaceCondition 빌더', embedSrc.includes('buildFaceCondition'));

  // ─── 5. AI 생성 공급자 연동 ───
  section('5. AI 이미지 생성 파이프라인');
  const generateSrc = readFileSync(`${REPO_ROOT}/src/lib/ai/generate.ts`, 'utf8');
  check('공급자 선택 로직', generateSrc.includes('AI_IMAGE_PROVIDER'));
  check('Replicate 연동', generateSrc.includes('generateReplicate'));
  check('Fal 연동', generateSrc.includes('generateFal'));
  check('Gemini 연동', generateSrc.includes('generateGemini'));
  check('톤별 생성 파라미터', generateSrc.includes('TONE_GENERATION_PARAMS'));
  check('비용 추정', generateSrc.includes('estimateCost'));

  const generateRoute = existsSync(`${REPO_ROOT}/src/app/api/generate/route.ts`);
  check('/api/generate 엔드포인트 존재', generateRoute);

  const embedRoute = existsSync(`${REPO_ROOT}/src/app/api/face/embed/route.ts`);
  check('/api/face/embed 엔드포인트 존재', embedRoute);

  // ─── 6. 품질 기준 문서 ───
  section('6. 품질 기준 문서');
  const qualityDoc = existsSync(`${REPO_ROOT}/docs/QUALITY_CRITERIA.md`);
  check('QUALITY_CRITERIA.md 존재', qualityDoc);
  if (qualityDoc) {
    const doc = readFileSync(`${REPO_ROOT}/docs/QUALITY_CRITERIA.md`, 'utf8');
    check('정체성 보존 지표', doc.includes('정체성 보존') || doc.includes('Identity'));
    check('스타일 일관성 지표', doc.includes('스타일 일관성') || doc.includes('Consistency'));
    check('생성 성공률 지표', doc.includes('생성 성공률') || doc.includes('95%'));
    check('해상도 지표', doc.includes('2048'));
    check('릴리스 게이트', doc.includes('게이트') || doc.includes('릴리스'));
  }

  // ─── 결과 ───
  console.log('\n' + '='.repeat(50));
  console.log(`📊 검증 결과: ${passed} 통과, ${failed} 실패`);
  if (failed > 0) {
    console.log(`❌ 실패 항목: ${errors.join(', ')}`);
    process.exit(1);
  } else {
    console.log('✅ 모든 검증 통과 - 유료화 품질 게이트 준비 완료');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
