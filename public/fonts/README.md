# 번들 레터링 폰트

이모티콘 대사(레터링)를 카톡 이모티콘처럼 또렷하고 정갈하게 그리기 위해 앱에 직접 포함한 폰트입니다.
모두 SIL Open Font License 1.1 이며, 원문 라이선스는 같은 폴더의 OFL-*.txt 입니다.

| 파일 | 패밀리 이름 | 원본 | 쓰임 |
| --- | --- | --- | --- |
| `EmotiHakRound.woff2` | EmotiHak Round | Jua 주아 (Google Fonts, OFL · 배달의민족) | 기본 레터링 — 둥글고 또렷한 라운드 고딕 (작은 크기에서도 시인성 최상) |
| `EmotiHakBrush.woff2` | EmotiHak Brush | Yeon Sung 연성체 (Google Fonts, OFL · BM Yeonsung) | 붓글씨 스타일 옵션 |
| `EmotiHakHand.woff2` | EmotiHak Hand | Gaegu Bold (Google Fonts, OFL) | 동글동글 손글씨 옵션 |

- 한글 음절(KS X 1001 · 2,350자)과 ASCII·기호를 서브셋해 WOFF2 로 압축했습니다
  (Round 189KB · Brush 336KB · Hand 215KB). 일상 대사에 쓰이는 한글은 세 서체 모두에서 빠짐없이 그려집니다.
  KS X 1001 밖의 드문 음절은 `globals.css` 의 대체 서체(Apple SD Gothic Neo · Malgun Gothic)로 이어집니다.
- 서체를 수정하지 않았고, 파일 이름만 앱 안에서 쓰는 이름으로 바꿨습니다(OFL 은 이를 허용합니다).
- 브라우저는 `src/app/globals.css` 의 `@font-face` 로 받고, SVG 를 이미지로 래스터화할 때는
  `src/lib/svg-fonts.ts` 가 같은 파일을 base64 로 SVG 안에 심습니다(서버·클라이언트 동일 렌더).
- 글자 폭 표(`src/lib/studio/caption.ts` 의 `FACE_METRICS`)는 각 폰트의 hmtx advance 값을 그대로 옮긴 값입니다.
