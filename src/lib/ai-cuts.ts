import type { DB } from '@/lib/store';

// ─────────────────────────────────────────────────────────────
// 사용자의 AI 생성 컷 찾기 (답장·브리핑 화면용, 서버 전용)
//  · 최신 AI 팩의 컷 중에서 템플릿 → 감정 순으로 맞는 컷을 고른다.
//  · 컷에 이미지가 아직 없으면(생성 전) 후보에서 뺀다.
// ─────────────────────────────────────────────────────────────

export interface AiCut {
  frameId: string;
  packId: string;
  imageUrl: string;
  /** 이미지 안 말풍선 대사 (화면 캡션은 이 값을 써야 이미지와 맞는다) */
  line: string;
  label: string;
  emotion: string;
  templateId: string;
}

export function findAiCut(
  db: DB,
  userId: string,
  match: { templateId?: string; emotion?: string },
): AiCut | null {
  const cuts = db.packs
    .filter((p) => p.userId === userId && p.renderer === 'ai')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((p) =>
      p.frames
        .filter((f) => !!f.imageId)
        .map((f) => ({ packId: p.id, frame: f })),
    );
  if (cuts.length === 0) return null;

  const hit =
    (match.templateId && cuts.find((c) => c.frame.templateId === match.templateId)) ||
    (match.emotion && cuts.find((c) => c.frame.emotion === match.emotion)) ||
    null;
  if (!hit) return null;

  return {
    frameId: hit.frame.id,
    packId: hit.packId,
    imageUrl: `/api/images/${hit.frame.imageId}`,
    line: hit.frame.line,
    label: hit.frame.label,
    emotion: hit.frame.emotion,
    templateId: hit.frame.templateId,
  };
}
