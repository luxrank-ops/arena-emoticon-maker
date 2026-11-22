# 번들 캘리그라피 폰트

이모티콘 대사(레터링)를 카톡 이모티콘처럼 생동감 있게 그리기 위해 앱에 직접 포함한 폰트입니다.
둘 다 SIL Open Font License 1.1 이며, 원문 라이선스는 같은 폴더의 OFL-*.txt 입니다.

| 파일 | 패밀리 이름 | 원본 | 쓰임 |
| --- | --- | --- | --- |
| `EmotiHakCalli.woff2` | EmotiHak Calli | Single Day (Google Fonts, OFL) | 기본 캘리그라피 레터링 |
| `EmotiHakHand.woff2` | EmotiHak Hand | Gaegu Bold (Google Fonts, OFL) | 동글동글 손글씨 옵션 |

- 한글 11,172음절(KS X 1001 + 확장)과 ASCII·기호를 서브셋해 WOFF2 로 압축했습니다(71KB / 220KB).
- 서체를 수정하지 않았고, 파일 이름만 앱 안에서 쓰는 이름으로 바꿨습니다(OFL 은 이를 허용합니다).
- 브라우저는 `src/app/globals.css` 의 `@font-face` 로 받고, SVG 를 이미지로 래스터화할 때는
  `src/lib/svg-fonts.ts` 가 같은 파일을 base64 로 SVG 안에 심습니다(서버·클라이언트 동일 렌더).
