# 실사 사진 샘플 (public/samples/photo)

이모티학의 대표 예시는 **실사 사진 기반 스티커**입니다. 이 폴더는 /pets · /couple · /team ·
홈 히어로 · 영문 랜딩 · /waitlist 에서 쓰는 실사 컷과, 그 컷을 만든 원본 사진을 담고 있습니다.

| 파일 | 내용 |
|---|---|
| `src-dog.webp`, `src-cat.webp`, `src-couple.webp`, `src-team.webp` | 누끼 전 원본 사진('원본 → 스티커' 예시용) |
| `pet-dog-sit.webp`, `pet-dog-beg.webp`, `pet-cat-sit.webp` | 반려동물 실사 컷 3종 |
| `couple-hug.webp`, `couple-sulk.webp`, `couple-heart.webp` | 커플 실사 컷 3종 |
| `team-laugh.webp`, `team-tired.webp`, `team-cheer.webp` | 팀·직장 실사 컷 3종 |

## 만든 방식

1. 흰 배경 스튜디오 사진을 생성한다(앱 화면용 예시 사진).
2. `emotihak-assets/cutout_u2net.py` 로 배경을 떼고 흰 외곽선을 붙여 512×512 투명 WebP 로 저장한다.
   - saliency 모델(u2net, onnxruntime)로 전경 확률을 먼저 얻고, 그 확률을 grabCut trimap 으로 넘겨 경계만 다듬는다.
   - 흰 셔츠·밝은 스웨터가 배경으로 빠지는 사진은 `--union`(예전 floodFill 알파와 합집합)으로 되살린다.
3. 앱은 이 컷 위에 대사를 그림으로 굽지 않고 캘리그라피 레이어로 얹는다(`src/lib/photo-samples.ts`).

```bash
python3 emotihak-assets/cutout_u2net.py emotihak-assets/photo-samples/team-base.png \
  emotihak/public/samples/photo/team-laugh.webp
```

## 표기 원칙

- 이 사진들은 **앱 화면용으로 생성한 예시 사진**이며 실제 고객·모델의 사진이 아닙니다.
  화면에서도 항상 '예시 이미지입니다'로 표기합니다.
- 실제 사용자가 올린 사진은 서버에 저장하지 않습니다(앱 정책 동일).
