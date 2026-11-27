# 실사 사진 샘플 (public/samples/photo)

이모티학의 대표 예시는 **실사 사진 기반 스티커**입니다. 이 폴더는 /pets · /couple · /team ·
홈 히어로 · 영문 랜딩 · /waitlist 에서 쓰는 실사 컷과, 그 컷을 만든 원본 사진을 담고 있습니다.

| 파일 | 내용 |
|---|---|
| `src-dog.webp`, `src-couple.webp`, `src-team.webp` | 누끼 전 원본 사진('원본 → 스티커' 예시용) |
| `pet-dog-sit.webp`, `pet-dog-beg.webp`, `pet-dog-look.webp` | 반려동물 실사 컷 3종 (앱 소유자의 시츄 사진 · 원본 배경 + 둥근 프레임) |
| `couple-hug.webp`, `couple-sulk.webp`, `couple-heart.webp` | 커플 실사 컷 3종 |
| `team-laugh.webp`, `team-tired.webp`, `team-cheer.webp` | 팀·직장 실사 컷 3종 |

## 만든 방식

1. 스튜디오 사진(사람)을 생성하거나, 반려동물은 앱 소유자가 보내 준 사진에서 구도가 좋은 컷을 고른다.
2. **사람·커플·팀** — `emotihak-assets/cutout_u2net.py` 로 배경을 떼고 흰 외곽선을 붙여 512×512 투명 WebP 로 저장한다.
   - saliency 모델(u2net, onnxruntime)로 전경 확률을 먼저 얻고, 그 확률을 grabCut trimap 으로 넘겨 경계만 다듬는다.
   - 흰 셔츠·밝은 스웨터가 배경으로 빠지는 사진은 `--union`(예전 floodFill 알파와 합집합)으로 되살린다.
3. **반려동물** — 누끼를 따지 않는다. 털 끝이 가늘어 배경 제거 경계가 지저분해지기 때문이다(2026-11-27 사용자 피드백
   "반려동물은 누끼를 안 따는 게 좋아. 털이 있으니깐 누끼가 완벽히 안 따져서 퀄리티가 안 나오네").
   - 고른 사진을 강아지 중심으로 타이트하게 크롭(사람 발·매트 등 주변 사물 제외)해 정사각으로 만든다.
   - 투명 바탕 위에 **부드러운 그림자 + 흰 얇은 보더의 둥근 사각 프레임**(512 기준 보더 15px · 모서리 78px)을 씌우고
     사진 경계에 옅은 헤어라인을 넣어 밝은 배경에서도 프레임이 보이게 한다.
   - 앱의 `CUTOUT_PHOTO_FRAME`(`src/lib/studio/photo-cutout.ts`, 보더 0.03 · 둥글기 0.16 · 여백 0.023)과 같은 비율이라
     사용자가 만든 반려동물 컷(`/studio/photo` 배경 유지, 펫 팩)과 화면이 일치한다.
4. 앱은 이 컷 위에 대사를 그림으로 굽지 않고 캘리그라피 레이어로 얹는다(`src/lib/photo-samples.ts`).

```bash
# 사람·커플·팀(누끼 + 흰 외곽선)
python3 emotihak-assets/cutout_u2net.py emotihak-assets/photo-samples/team-base.png \
  emotihak/public/samples/photo/team-laugh.webp
```

## 표기 원칙

- 커플·팀 사진은 **앱 화면용으로 생성한 예시 사진**이며 실제 고객·모델의 사진이 아닙니다.
  반려동물 컷 3종(`pet-dog-*.webp`, `src-dog.webp`)은 앱 소유자가 직접 제공한 반려견 사진으로 만든 것입니다(사용 허락 받은 사진).
  화면에서는 어느 쪽이든 항상 '예시 이미지입니다'로 표기합니다.
- 실제 사용자가 올린 사진은 서버에 저장하지 않습니다(앱 정책 동일).
