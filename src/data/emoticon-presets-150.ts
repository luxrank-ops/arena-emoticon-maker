// ─────────────────────────────────────────────────────────────
// 이모티콘 표정·포즈·이펙트·대사 프리셋 150종
//  · 사용자가 제공한 150종 원본 데이터를 문구 수정 없이 그대로 담는다.
//    (원본 7개 필드: id · category · keyword · expression · pose · effect · dialogue)
//  · 생성 파이프라인이 바로 쓸 수 있도록 감정·영문 지시·레이어 이펙트를 파생해 둔다.
//  · 데이터 무결성은 scripts/test-presets-150.ts 가 150건 전수로 검사한다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import type { BubbleStyle, EffectKind, TextLayer, TextLayerStyle } from '@/lib/studio/layers';
import type { Locale } from '@/lib/i18n/locale';
import { PRESET_EN_COPY, type PresetEnCopy } from './emoticon-presets-150-en';

export interface PresetSourceRow {
  /** 1~150 */
  id: number;
  category: string;
  keyword: string;
  expression: string;
  pose: string;
  effect: string;
  dialogue: string;
}

export interface PresetCategory {
  id: string;
  label: string;
  labelEn: string;
  emoji: string;
  count: number;
}

export interface EmoticonPreset extends PresetSourceRow {
  /** 이모티콘 생성 감정 축 (12종) — AI 프롬프트와 글자 효과에 쓰인다 */
  emotion: Emotion;
  categoryEn: string;
  /** 화면·프롬프트용 영문 문구 */
  en: PresetEnCopy;
  /** 말풍선에 넣는 한 줄 대사 (원본 dialogue 의 첫 문구) */
  line: string;
  lineEn: string;
  /** 앱이 합성하는 레이어 장식 (원본 effect 문구에서 파생) */
  effectKind: EffectKind;
  bubble: BubbleStyle;
  style: TextLayerStyle;
}

/** 원본 150건 — 순서·문구를 바꾸지 않는다. */
export const PRESET_SOURCE: PresetSourceRow[] = [
  { id: 1, category: "기쁨·환희·긍정", keyword: "환호 / 신남", expression: "초승달 모양 눈, 크게 벌린 입", pose: "양팔을 번쩍 들고 점프하거나 만세", effect: "반짝이(✨), 폭죽, 음표(🎵)", dialogue: "신나! / 최고!" },
  { id: 2, category: "기쁨·환희·긍정", keyword: "뿌듯함 / 으쓱", expression: "지그시 감은 눈, 만족스러운 미소", pose: "팔짱을 끼거나 허리에 손 얹기", effect: "어깨 위 후광, 엄지척(👍)", dialogue: "역시 나야 / 뿌듯" },
  { id: 3, category: "기쁨·환희·긍정", keyword: "폭소 / 빵터짐", expression: "눈물 맺힌 채 꽉 감은 눈, 대폭소", pose: "배를 잡고 뒤로 넘어가며 구름", effect: "ㅋㅋㅋ 텍스트, 눈물 튐", dialogue: "ㅋㅋㅋㅋ / 빵터짐" },
  { id: 4, category: "기쁨·환희·긍정", keyword: "자본주의 미소", expression: "눈은 웃지 않고 입꼬리만 억지로 올림", pose: "차렷 자세로 뻣뻣하게 엄지척", effect: "관자놀이 땀방울, 기계적 광택", dialogue: "네^^ / 알겠습니다" },
  { id: 5, category: "기쁨·환희·긍정", keyword: "상쾌 / 후련함", expression: "눈을 감고 깊게 숨을 들이마시는 표정", pose: "기지개를 켜며 하늘을 올려다봄", effect: "맑은 바람 선, 꽃잎 날림", dialogue: "살 것 같다 / 후련" },
  { id: 6, category: "애정·설렘·호감", keyword: "사랑 / 반함", expression: "눈동자가 하트(😍)로 변함, 헤벌쭉 입", pose: "양손으로 볼을 감싸고 몸을 기울임", effect: "머리 위로 하트(💕) 몽글몽글", dialogue: "사랑해 / 반했어" },
  { id: 7, category: "애정·설렘·호감", keyword: "심쿵 / 설렘", expression: "동공 확장, 살짝 벌어진 입, 홍조", pose: "한 손으로 가슴을 꽉 부여잡음", effect: "가슴에서 하트 튀어나옴(💓)", dialogue: "심쿵! / 두근두근" },
  { id: 8, category: "애정·설렘·호감", keyword: "부끄러움", expression: "내리깐 눈, 작게 오므린 입, 팔자 눈썹", pose: "양손으로 얼굴을 가리고 몸을 꼼", effect: "양볼 진한 분홍색 사선 홍조", dialogue: "부끄 / 쑥스.." },
  { id: 9, category: "애정·설렘·호감", keyword: "애교 / 앙탈", expression: "초롱초롱한 큰 눈, 고양이 입(ω)", pose: "두 주먹을 볼 옆에 대고 갸우뚱", effect: "반짝이 필터, 꽃받침 포즈", dialogue: "뿌잉 / 제발~" },
  { id: 10, category: "애정·설렘·호감", keyword: "그리움 / 애틋", expression: "아련하게 먼 곳을 바라보는 촉촉한 눈", pose: "창밖을 보거나 인형을 꼭 끌어안음", effect: "흩날리는 낙엽, 잔잔한 하트", dialogue: "보고 싶어 / 힝" },
  { id: 11, category: "슬픔·우울·상처", keyword: "오열 / 통곡", expression: "꽉 감은 눈에서 폭포수 눈물, 엉엉 입", pose: "무릎 꿇고 바닥을 치며 고개 젖힘", effect: "강물처럼 고인 눈물, ㅠㅠ", dialogue: "엉엉 / ㅠㅠㅠ" },
  { id: 12, category: "슬픔·우울·상처", keyword: "훌쩍임 / 서러움", expression: "눈물 그렁그렁한 큰 눈, 삐죽 아랫입술", pose: "소매나 손수건으로 눈가를 훔침", effect: "콧물 방울, 어두운 배경 음영", dialogue: "훌쩍 / 서러워" },
  { id: 13, category: "슬픔·우울·상처", keyword: "상처받음 (마상)", expression: "충격받아 커진 동공, 떨리는 입술", pose: "가슴을 부여잡고 뒤로 물러남", effect: "가슴에 깨진 하트(💔) 꽂힘", dialogue: "마상.. / 맴찢" },
  { id: 14, category: "슬픔·우울·상처", keyword: "시무룩 / 쭈굴", expression: "축 처진 눈썹과 눈꼬리, 다문 입", pose: "구석에 쪼그려 앉아 바닥에 낙서", effect: "머리 위 작은 먹구름, 기운 빠짐", dialogue: "시무룩 / 쭈굴.." },
  { id: 15, category: "슬픔·우울·상처", keyword: "후회 / 자책", expression: "질끈 감은 눈, 머리를 쥐어뜯는 표정", pose: "이불을 뒤집어쓰거나 벽에 머리 박음", effect: "과거 회상 구름, 아픈 띠 두름", dialogue: "내가 미쳤지 / 후회" },
  { id: 16, category: "무기력·피로·멘붕", keyword: "좌절 / 절망", expression: "초점 없는 퀭한 눈, 힘없이 벌어진 입", pose: "바닥에 엎드려 뻗쳐 꼼짝 안 함", effect: "먹구름과 비(🌧️), 영혼 탈출", dialogue: "좌절 / 망했다" },
  { id: 17, category: "무기력·피로·멘붕", keyword: "지침 / 방전", expression: "반쯤 감긴 졸린 눈, 다크서클", pose: "바닥에 액체처럼 녹아내림", effect: "배터리 방전 아이콘(🪫)", dialogue: "방전 / 기절.." },
  { id: 18, category: "무기력·피로·멘붕", keyword: "귀찮음 / 만사귀찮", expression: "뜨는 둥 마는 둥 한 눈, 일자 입", pose: "소파나 바닥에 누워 손가락만 까딱", effect: "거미줄, 뒹굴거리는 효과선", dialogue: "귀찮아 / 암것도안함" },
  { id: 19, category: "무기력·피로·멘붕", keyword: "허탈 / 영혼가출", expression: "흰자위만 보이거나 점으로 변한 눈", pose: "넋이 나간 채 멍하니 허공 응시", effect: "입에서 영혼(유령)이 빠져나감", dialogue: "멍.. / 영혼가출" },
  { id: 20, category: "무기력·피로·멘붕", keyword: "현타 / 체념", expression: "모든 것을 내려놓은 평온한 반눈", pose: "합장하거나 차를 마시며 허공 응시", effect: "뒷배경에 우주 또는 득도 후광", dialogue: "현타 온다 / 해탈" },
  { id: 21, category: "분노·짜증·경멸", keyword: "극대노 / 폭발", expression: "치켜뜬 눈, 이빨을 드러내며 포효", pose: "주먹 불끈 쥐고 책상 내리침", effect: "입에서 불 뿜기(🔥), 핏줄(💢)", dialogue: "극대노! / 빡쳐!" },
  { id: 22, category: "분노·짜증·경멸", keyword: "삐짐 / 토라짐", expression: "눈 흘기며 째려봄, 잔뜩 부푼 볼", pose: "팔짱 끼고 등 돌린 채 고개만 홱", effect: "콧김(흥!), 머리 위 뾰족 말풍선", dialogue: "흥! / 삐졌어" },
  { id: 23, category: "분노·짜증·경멸", keyword: "정색 / 어이없음", expression: "영혼 없는 점 눈, 굳게 다문 일자 입", pose: "미동 없이 차렷 자세로 정면 응시", effect: "하얗게 질린 배경, 정적(...)", dialogue: "... / 할말하않" },
  { id: 24, category: "분노·짜증·경멸", keyword: "비웃음 / 한심", expression: "반쯤 감긴 눈, 한쪽만 올라간 입꼬리", pose: "턱을 괴고 고개를 절레절레 흔듦", effect: "차가운 시선 화살표, 코웃음", dialogue: "쯧쯧 / 어휴.." },
  { id: 25, category: "분노·짜증·경멸", keyword: "부들부들 / 참을인", expression: "꽉 깨문 어금니, 파르르 떨리는 눈꺼풀", pose: "주먹을 꽉 쥐고 온몸을 덜덜 떰", effect: "이마에 忍 마크, 진동 효과선", dialogue: "참는다 / 부들부들" },
  { id: 26, category: "질투·억울·승부욕", keyword: "질투 / 시기", expression: "날카롭게 뜬 눈, 입술 꽉 깨문 표정", pose: "벽 뒤에서 손톱으로 벽을 긁음", effect: "눈에서 불꽃/레이저, 붉은 오라", dialogue: "부러워 / 질투나" },
  { id: 27, category: "질투·억울·승부욕", keyword: "억울함 / 분함", expression: "눈물 그렁그렁, 치켜올라간 눈썹", pose: "발을 동동 구르며 손가락질 호소", effect: "억울함 강조 집중선, 땀방울", dialogue: "억울해! / 내말들어" },
  { id: 28, category: "질투·억울·승부욕", keyword: "승부욕 / 비장함", expression: "불타오르는 눈동자, 굳게 다문 입", pose: "머리에 필승 띠를 매고 주먹 불끈", effect: "불꽃 배경, 결의에 찬 아우라", dialogue: "가보자고 / 불끈" },
  { id: 29, category: "질투·억울·승부욕", keyword: "음흉 / 능글맞음", expression: "게슴츠레한 눈, 음흉한 미소", pose: "두 손바닥을 싹싹 비비며 눈썹 들썩", effect: "보라색 음흉 오라, 입꼬리 반짝", dialogue: "크크크 / 계획대로" },
  { id: 30, category: "놀람·당황·공포", keyword: "충격 / 경악", expression: "접시만 하게 커진 눈, 턱 빠진 입", pose: "두 손으로 머리 감싸고 뒤로 자빠짐", effect: "번개(⚡) 효과, 강렬한 집중선", dialogue: "헐!! / 대박사건" },
  { id: 31, category: "놀람·당황·공포", keyword: "당황 / 식은땀", expression: "흔들리는 동공(동공 지진), 어색한 입", pose: "손을 허공에 휘저으며 어쩔 줄 모름", effect: "얼굴 옆 큼지막한 식은땀(💦)", dialogue: "어버버 / 당황;;" },
  { id: 32, category: "놀람·당황·공포", keyword: "멘붕 / 뇌정지", expression: "빙글빙글 돌아가는 눈동자, 벌어진 입", pose: "머리를 쥐어뜯거나 그대로 얼어붙음", effect: "머리 위 에러/로딩 아이콘, 연기", dialogue: "멘붕 / 뇌정지" },
  { id: 33, category: "놀람·당황·공포", keyword: "민망 / 이불킥", expression: "질끈 감은 눈, 이불을 깨문 붉은 얼굴", pose: "침대 위에서 이불을 발로 뻥뻥 참", effect: "얼굴 전체 빨간 홍조, 열기 연기", dialogue: "이불킥 / 아창피해" },
  { id: 34, category: "놀람·당황·공포", keyword: "공포 / 무서움", expression: "새하얗게 질린 얼굴, 파란 입술", pose: "무릎 끌어안고 구석에서 덜덜 떰", effect: "몸 주변 진동 선, 으스스한 한기", dialogue: "무서워 / 덜덜덜" },
  { id: 35, category: "놀람·당황·공포", keyword: "눈치 봄 / 살핌", expression: "눈동자만 좌우로 굴림, 긴장된 입", pose: "문틈이나 벽 뒤에서 얼굴만 빼꼼", effect: "물음표(?), 땀방울 한 방울", dialogue: "눈치.. / 빼꼼" },
  { id: 36, category: "호기심·의심·생리반응", keyword: "궁금 / 호기심", expression: "별 박힌 듯 반짝이는 눈, 오 모양 입", pose: "고개를 45도 갸우뚱 기울임", effect: "머리 위 물음표(?), 돋보기 소품", dialogue: "궁금해 / 뭐야?" },
  { id: 37, category: "호기심·의심·생리반응", keyword: "의심 / 경계", expression: "실눈 뜨고 한쪽 눈썹만 치켜올림", pose: "턱을 괴고 위아래로 훑어봄", effect: "찌릿하는 시선 레이저", dialogue: "의심.. / 진짜?" },
  { id: 38, category: "호기심·의심·생리반응", keyword: "간절함 / 애원", expression: "눈물 고인 사슴 눈망울, 떨리는 입", pose: "두 손 모아 무릎 꿇고 싹싹 빎", effect: "후광 효과, 반짝이는 눈물", dialogue: "제발요 / 부탁해" },
  { id: 39, category: "호기심·의심·생리반응", keyword: "지루함 / 심심", expression: "초점 풀린 눈, 크게 하품하는 입", pose: "바닥에 엎드려 손가락으로 긁적임", effect: "하품 연기, 시계/달팽이 소품", dialogue: "심심해 / 지루해" },
  { id: 40, category: "호기심·의심·생리반응", keyword: "배고픔 / 꼬르륵", expression: "힘없이 풀린 눈, 침 흘리는 입", pose: "배를 움켜쥐고 숟가락/젓가락 듦", effect: "배에서 꼬르륵 효과음, 음식 환영", dialogue: "배고파 / 밥줘" },
  { id: 41, category: "호기심·의심·생리반응", keyword: "배부름 / 만족", expression: "나른하게 감긴 눈, 행복한 트림 표정", pose: "볼록 나온 배를 두드리며 뒤로 기댐", effect: "반짝이, 소화제/포만감 아이콘", dialogue: "배불러 / 꺼억" },
  { id: 42, category: "호기심·의심·생리반응", keyword: "졸림 / 비몽사몽", expression: "반쯤 감긴 눈, 눈물 고인 하품", pose: "고개를 꾸벅꾸벅 졸거나 이불 덮음", effect: "Zzz 텍스트, 초승달/베개", dialogue: "졸려.. / 굿나잇" },
  { id: 43, category: "호기심·의심·생리반응", keyword: "추움 / 덜덜", expression: "파랗게 질린 입술, 오들오들 떠는 표정", pose: "두 팔로 몸을 감싸 안고 웅크림", effect: "입김(하~), 눈송이(❄️), 진동선", dialogue: "추워 / 오들오들" },
  { id: 44, category: "호기심·의심·생리반응", keyword: "더움 / 녹아내림", expression: "혀를 내밀고 헐떡이는 지친 표정", pose: "부채질을 하거나 바닥에 녹아내림", effect: "이글거리는 태양(☀️), 땀 줄줄", dialogue: "더워 / 살려줘" },
  { id: 45, category: "호기심·의심·생리반응", keyword: "아픔 / 고통", expression: "눈물 찔끔, 인상을 잔뜩 찌푸린 표정", pose: "아픈 부위를 감싸 쥐고 웅크림", effect: "아픈 부위 빨간 반짝임, 반창고", dialogue: "아야! / 아파요" },
  { id: 46, category: "인사·예의·감사", keyword: "손 흔들기 (하이)", expression: "활짝 웃는 초승달 눈, 크게 벌린 입", pose: "한 손을 머리 위로 들어 좌우로 흔듦", effect: "반짝이(✨), 손 주변 흔들림 선", dialogue: "안녕! / 하이~" },
  { id: 47, category: "인사·예의·감사", keyword: "90도 폴더 인사", expression: "눈을 꾹 감고 공손하게 다문 입", pose: "허리를 90도로 직각으로 숙여 인사", effect: "머리 위 반짝임, 정중한 효과선", dialogue: "안녕하세요 / 꾸벅" },
  { id: 48, category: "인사·예의·감사", keyword: "큰절 올리기", expression: "진지하고 경건하게 감은 눈", pose: "바닥에 엎드려 두 손을 모으고 큰절", effect: "방석 소품, 후광 효과, 꽃가루", dialogue: "감사합니당 / 복받으세요" },
  { id: 49, category: "인사·예의·감사", keyword: "경례 (충성)", expression: "늠름하고 진지한 눈빛, 굳게 다문 입", pose: "허리를 펴고 오른손을 이마에 대고 경례", effect: "눈에서 빛남, 각 잡힌 효과선", dialogue: "충성! / 알겠습니다" },
  { id: 50, category: "인사·예의·감사", keyword: "꽃다발/선물 전달", expression: "수줍으면서도 기분 좋은 미소", pose: "양손으로 커다란 꽃다발이나 상자를 내밈", effect: "하트(💕), 반짝이는 리본, 꽃잎", dialogue: "선물이야 / 고마워" },
  { id: 51, category: "긍정·거절·리액션", keyword: "엄지척 (최고)", expression: "자신만만하게 윙크하는 눈, 씨익 웃는 입", pose: "한 손 또는 양손으로 엄지손가락을 치켜세움", effect: "엄지 끝에 반짝이(✨), 후광", dialogue: "최고야! / 굿굿" },
  { id: 52, category: "긍정·거절·리액션", keyword: "OK 사인", expression: "밝고 경쾌하게 웃는 표정", pose: "엄지와 검지로 동그라미를 만들어 얼굴 옆에 댐", effect: "주변에 작은 별(⭐), 음표", dialogue: "OK! / 콜!" },
  { id: 53, category: "긍정·거절·리액션", keyword: "끄덕끄덕 (동의)", expression: "온화하고 이해심 넘치는 미소", pose: "고개를 위아래로 크게 끄덕이는 동작", effect: "고개 움직임 잔상선, 반짝이", dialogue: "응응 / 인정!" },
  { id: 54, category: "긍정·거절·리액션", keyword: "절레절레 (거절)", expression: "단호하게 다문 입, 찡그린 눈썹", pose: "양팔로 크게 X자를 그리거나 고개를 가로저음", effect: "빨간색 X 마크(❌), 단호한 집중선", dialogue: "안 돼! / 싫어!" },
  { id: 55, category: "긍정·거절·리액션", keyword: "못 본 척 / 모른 척", expression: "시선을 회피하며 휘파람 부는 입", pose: "뒤돌아서서 딴청을 피우거나 눈을 가림", effect: "음표(🎵), 시선 회피 화살표", dialogue: "난 몰라 / 딴청.." },
  { id: 56, category: "응원·위로·축하", keyword: "응원봉 흔들기", expression: "열정적으로 빛나는 눈, 힘차게 외치는 입", pose: "양손에 응원봉이나 수술을 들고 흔듦", effect: "반짝이는 응원봉 불빛, 음표", dialogue: "파이팅! / 힘내자!" },
  { id: 57, category: "응원·위로·축하", keyword: "토닥토닥 (위로)", expression: "따뜻하고 다정한 눈빛, 부드러운 미소", pose: "상대의 등이나 머리를 부드럽게 두드려줌", effect: "따뜻한 노란색 오라, 작은 하트", dialogue: "토닥토닥 / 수고했어" },
  { id: 58, category: "응원·위로·축하", keyword: "박수치기", expression: "감탄하며 활짝 웃는 표정", pose: "양손을 가슴 앞에서 힘차게 마주 침", effect: "손뼉 주변 폭죽 효과, 짝짝짝", dialogue: "짝짝짝! / 대단해" },
  { id: 59, category: "응원·위로·축하", keyword: "생일 축하 (케이크)", expression: "신나고 들뜬 표정, 크게 웃는 입", pose: "촛불이 켜진 케이크를 들고 춤춤", effect: "폭죽(🎉), 고깔모자, 흩날리는 색종이", dialogue: "생일축하해 / 추카추카" },
  { id: 60, category: "응원·위로·축하", keyword: "기도하기", expression: "간절하게 두 눈을 꼭 감은 표정", pose: "두 손을 가슴 앞에 모으고 하늘을 향함", effect: "머리 위 천사 링 또는 한 줄기 빛", dialogue: "제발.. / 비나이다" },
  { id: 61, category: "애정·스킨십", keyword: "하트 날리기", expression: "윙크하는 눈, 입꼬리가 올라간 미소", pose: "손가락 하트 또는 양손으로 큰 하트를 만듦", effect: "주변에 하트(💖)가 폭포처럼 쏟아짐", dialogue: "뿅! / 내 마음" },
  { id: 62, category: "애정·스킨십", keyword: "포옹 (꼭 안아주기)", expression: "눈을 감고 행복해하는 편안한 표정", pose: "양팔을 넓게 벌려 상대를 꽉 껴안음", effect: "포근한 핑크빛 배경, 하트 뭉게뭉게", dialogue: "안아줄게 / 꼬옥~" },
  { id: 63, category: "애정·스킨십", keyword: "뽀뽀하기", expression: "눈을 질끈 감고 입술을 쭉 내민 표정", pose: "몸을 앞으로 기울이며 입술을 내밈", effect: "입술 마크(💋), 붉어진 볼 홍조", dialogue: "쪽! / 뽀뽀~" },
  { id: 64, category: "애정·스킨십", keyword: "쓰담쓰담", expression: "인자하고 귀여워 죽겠다는 표정", pose: "손을 뻗어 상대의 머리를 부드럽게 쓰다듬음", effect: "손길 주변에 반짝이, 몽글몽글 효과", dialogue: "쓰담쓰담 / 착하다" },
  { id: 65, category: "애정·스킨십", keyword: "찔러보기 (관심)", expression: "장난기 가득한 눈, 호기심 어린 입", pose: "검지손가락으로 허공이나 상대를 콕 찌름", effect: "손가락 끝에 콕! 효과음, 물음표", dialogue: "뭐해? / 자니?" },
  { id: 66, category: "직장·학교·업무", keyword: "출근길 (지침)", expression: "초점 없는 퀭한 눈, 다크서클", pose: "무거운 가방을 메고 터덜터덜 걸어감", effect: "영혼 가출, 머리 위 먹구름", dialogue: "출근.. / 살려줘" },
  { id: 67, category: "직장·학교·업무", keyword: "칼퇴근 (질주)", expression: "세상에서 가장 행복한 환희의 표정", pose: "가방을 들고 바람처럼 뛰쳐나감", effect: "속도선, 날아가는 서류, 반짝이", dialogue: "칼퇴! / 퇴근이다!" },
  { id: 68, category: "직장·학교·업무", keyword: "폭풍 타자 / 열일", expression: "불타오르는 눈빛, 비장하게 다문 입", pose: "키보드나 노트북을 빛의 속도로 두드림", effect: "손에서 불꽃 튐, 잔상 효과, 커피잔", dialogue: "열일 중 / 타닥타닥" },
  { id: 69, category: "직장·학교·업무", keyword: "열공 / 필기", expression: "안경을 치켜올리며 집중하는 눈빛", pose: "책상 앞에서 펜을 쥐고 필기하거나 책 봄", effect: "머리 위 전구(💡), 집중선 배경", dialogue: "열공! / 집중 모드" },
  { id: 70, category: "일상·생활·취미", keyword: "폭풍 먹방 (식사)", expression: "볼이 빵빵해지도록 음식을 문 행복한 표정", pose: "양손에 숟가락과 젓가락을 들고 먹음", effect: "맛있는 음식(고기, 면), 반짝이", dialogue: "냠냠 / 밥먹자!" },
  { id: 71, category: "일상·생활·취미", keyword: "커피 수혈", expression: "반쯤 감긴 눈이 번쩍 뜨이는 표정", pose: "아이스 아메리카노를 빨대로 쪽 빨아마심", effect: "커피잔, 배터리 충전 아이콘(🔋)", dialogue: "커피수혈 / 아아필수" },
  { id: 72, category: "일상·생활·취미", keyword: "이불 속 뒹굴거리기", expression: "세상 편안하고 나른한 미소", pose: "이불을 돌돌 말고 누워 스마트폰을 봄", effect: "푹신한 베개, 스마트폰 불빛, 하트", dialogue: "이불밖위험 / 뒹굴뒹굴" },
  { id: 73, category: "일상·생활·취미", keyword: "폭풍 쇼핑 (플렉스)", expression: "눈이 돈 모양(🤑) 또는 반짝이는 눈", pose: "양손 가득 쇼핑백을 들고 춤추며 걸어감", effect: "흩날리는 지폐/카드, 쇼핑백 산더미", dialogue: "질렀다! / 플렉스" },
  { id: 74, category: "일상·생활·취미", keyword: "운동 / 득근", expression: "땀을 흘리며 이를 악문 결연한 표정", pose: "아령을 들거나 러닝머신을 힘차게 달림", effect: "땀방울(💦), 알통 표시(💪), 불꽃", dialogue: "오운완! / 득근!" },
  { id: 75, category: "역동적 액션·이동", keyword: "전력 질주 (가는 중)", expression: "땀을 뻘뻘 흘리며 다급하게 벌린 입", pose: "팔다리가 바퀴처럼 돌아가며 뛰어감", effect: "흙먼지, 속도선, 시계 아이콘", dialogue: "가는 중! / 헐레벌떡" },
  { id: 76, category: "직장·학교·심화", keyword: "야근 지옥", expression: "초점 잃은 충혈된 눈, 다크서클", pose: "모니터 앞에 넋을 놓고 앉아 있음", effect: "달과 별, 텅 빈 커피잔, 영혼 가출", dialogue: "야근 중.. / 집갈래" },
  { id: 77, category: "직장·학교·심화", keyword: "월급 루팡", expression: "능글맞게 웃는 눈, 입꼬리 씰룩", pose: "모니터 뒤에 숨어 몰래 스마트폰 봄", effect: "딴청 음표(🎵), 시계 아이콘", dialogue: "월급루팡 / 딴짓중" },
  { id: 78, category: "직장·학교·심화", keyword: "월급날 (환희)", expression: "눈이 하트와 별로 반짝임, 대폭소", pose: "하늘에서 떨어지는 지폐를 받으며 춤춤", effect: "흩날리는 돈다발(💸), 반짝이", dialogue: "월급날! / 스쳐지나감" },
  { id: 79, category: "직장·학교·심화", keyword: "텅장 (잔고 부족)", expression: "사색이 된 얼굴, 턱이 빠질 듯 벌린 입", pose: "텅 빈 지갑을 뒤집어 털고 있음", effect: "지갑에서 날아가는 나방, 바람 선", dialogue: "텅장.. / 거지됨" },
  { id: 80, category: "직장·학교·심화", keyword: "회식 공포", expression: "억지웃음과 관자놀이 식은땀", pose: "술잔을 들고 어색하게 건배 포즈", effect: "소주병/맥주잔, 흔들리는 동공", dialogue: "건배.. / 집에언제가" },
  { id: 81, category: "직장·학교·심화", keyword: "연차 / 휴가", expression: "선글라스를 끼고 세상 행복한 미소", pose: "캐리어를 끌며 콧노래를 부르며 걸어감", effect: "야자수, 비행기, 반짝이 효과", dialogue: "연차다! / 휴가중" },
  { id: 82, category: "직장·학교·심화", keyword: "발표 / 면접 긴장", expression: "뻣뻣하게 굳은 얼굴, 파르르 떨리는 입", pose: "마이크를 잡고 사시나무처럼 덜덜 떰", effect: "진동 효과선, 식은땀 폭포(💦)", dialogue: "덜덜덜 / 긴장됨" },
  { id: 83, category: "직장·학교·심화", keyword: "시험 망함", expression: "하얗게 불태운 잿빛 얼굴, 공허한 눈", pose: "시험지를 구겨 쥐고 무릎 꿇음", effect: "비 내리는 구름(🌧️), F학점 마크", dialogue: "망했다 / 다음생에" },
  { id: 84, category: "직장·학교·심화", keyword: "결재 / 승인 대기", expression: "초롱초롱하지만 눈치 보는 사슴 눈망울", pose: "두 손을 모으고 서류/폰을 내밀며 기다림", effect: "반짝이는 눈망울, 땀방울 한 방울", dialogue: "부탁드려요 / 확인요!" },
  { id: 85, category: "직장·학교·심화", keyword: "업무 폭탄", expression: "경악하며 뒤로 자빠지는 표정", pose: "산더미처럼 쌓인 서류 더미에 깔림", effect: "폭탄 아이콘(💣), 서류 흩날림", dialogue: "일폭탄 / 살려줘" },
  { id: 86, category: "직장·학교·심화", keyword: "점심 메뉴 고민", expression: "진지하게 턱을 괴고 눈동자를 굴림", pose: "머리를 싸매고 메뉴판을 들여다봄", effect: "머리 위 물음표(?), 음식 아이콘들", dialogue: "오늘뭐먹지 / 결정장애" },
  { id: 87, category: "직장·학교·심화", keyword: "지각 위기", expression: "눈이 튀어나올 듯 다급한 표정", pose: "식빵을 입에 물고 전속력으로 뛰어감", effect: "시계(⏰), 속도선, 흙먼지", dialogue: "지각이다! / 헉헉" },
  { id: 88, category: "직장·학교·심화", keyword: "회의 중 멍때리기", expression: "눈은 떴지만 영혼이 없는 동태 눈", pose: "턱을 괴고 고개를 끄덕이는 척함", effect: "머리 위 텅 빈 말풍선, 멍한 효과", dialogue: "네네.. / 아무생각없음" },
  { id: 89, category: "직장·학교·심화", keyword: "금요일 (불금)", expression: "환희에 찬 눈빛, 크게 벌린 환호 입", pose: "넥타이/가방을 던지고 만세를 부름", effect: "폭죽(🎉), 불꽃 효과, 반짝이", dialogue: "불금이다! / 주말시작" },
  { id: 90, category: "직장·학교·심화", keyword: "일요일 밤 (월요병)", expression: "절망과 공포에 질린 창백한 얼굴", pose: "시계를 바라보며 머리를 쥐어뜯음", effect: "다가오는 월요일 그림자, 번개", dialogue: "월요일실화냐 / 끔찍" },
  { id: 91, category: "디테일 일상·라이프", keyword: "야식 유혹", expression: "침을 꼴깍 삼키며 반짝이는 눈", pose: "치킨/라면을 앞에 두고 갈등하는 포즈", effect: "악마와 천사 날개, 반짝이는 야식", dialogue: "참을까말까 / 야식각" },
  { id: 92, category: "디테일 일상·라이프", keyword: "다이어트 결심", expression: "비장하게 불타오르는 눈빛, 앙다문 입", pose: "샐러드를 들고 주먹을 불끈 쥠", effect: "불꽃 배경, 살뺀다 머리띠", dialogue: "다이어트! / 오늘부터1일" },
  { id: 93, category: "디테일 일상·라이프", keyword: "다이어트 실패", expression: "자포자기한 듯 행복한 먹방 표정", pose: "양손에 피자와 치킨을 들고 폭풍 흡입", effect: "내일부터 텍스트, 하트 뿅뿅", dialogue: "맛있으면0칼로리 / 내일부터" },
  { id: 94, category: "디테일 일상·라이프", keyword: "만취 / 술주정", expression: "풀린 눈, 빨갛게 달아오른 코와 볼", pose: "넥타이를 머리에 매고 혀 꼬인 표정", effect: "딸꾹질 효과, 빙글빙글 도는 별", dialogue: "취한다~ / 한잔더!" },
  { id: 95, category: "디테일 일상·라이프", keyword: "숙취 / 해장 필요", expression: "초록빛으로 질린 얼굴, 찡그린 미간", pose: "머리를 감싸 쥐고 바닥에 쓰러져 있음", effect: "어지럼증 소용돌이, 해장국 환영", dialogue: "숙취.. / 속쓰려" },
  { id: 96, category: "디테일 일상·라이프", keyword: "택배 도착 (설렘)", expression: "기쁨에 겨워 어쩔 줄 모르는 초승달 눈", pose: "커다란 택배 상자를 끌어안고 뺨을 부빔", effect: "반짝이(✨), 하트, 택배 상자", dialogue: "택배왔다! / 뜯어보자" },
  { id: 97, category: "디테일 일상·라이프", keyword: "스마트폰 중독", expression: "어둠 속에서 화면 빛만 반사되는 눈", pose: "이불 속에 엎드려 밤새 스마트폰 터치", effect: "스마트폰 불빛, 다크서클, 달 아이콘", dialogue: "폰하는중 / 잘생각없음" },
  { id: 98, category: "디테일 일상·라이프", keyword: "집순이/집돌이 모드", expression: "세상 편안하고 나른한 미소", pose: "담요를 뒤집어쓰고 귤 까먹으며 TV 시청", effect: "귤 껍질 산더미, 포근한 오라", dialogue: "집이최고 / 나가지마" },
  { id: 99, category: "디테일 일상·라이프", keyword: "산책 / 나들이", expression: "상쾌하게 바람을 느끼는 행복한 표정", pose: "콧노래를 부르며 가볍게 발걸음을 옮김", effect: "음표(🎵), 햇살, 나비와 꽃", dialogue: "날씨좋다 / 산책중" },
  { id: 100, category: "디테일 일상·라이프", keyword: "샤워 / 씻기 귀찮음", expression: "멍하니 허공을 보며 미루는 표정", pose: "수건을 어깨에 걸치고 꼼짝 안 함", effect: "시계 아이콘, 귀차니즘 먹구름", dialogue: "씻어야되는데 / 귀찮.." },
  { id: 101, category: "디테일 일상·라이프", keyword: "알람 무시 (늦잠)", expression: "평온하게 자다가 눈을 번쩍 뜨는 표정", pose: "울리는 알람 시계를 손으로 끄고 다시 잠", effect: "Zzz, 울리는 알람시계(⏰)", dialogue: "5분만더.. / 앗늦었다" },
  { id: 102, category: "디테일 일상·라이프", keyword: "청소 / 정리정돈", expression: "상쾌하고 뿌듯한 표정", pose: "앞치마를 두르고 빗자루/청소기를 듦", effect: "반짝반짝 광택 효과(✨)", dialogue: "대청소! / 깔끔" },
  { id: 103, category: "디테일 일상·라이프", keyword: "요리하기 (셰프)", expression: "진지하지만 설레는 눈빛", pose: "프라이팬을 흔들며 요리하는 포즈", effect: "맛있는 냄새 연기, 하트", dialogue: "요리중 / 기대해" },
  { id: 104, category: "디테일 일상·라이프", keyword: "요리 실패 (탄 음식)", expression: "당황하며 식은땀을 흘리는 표정", pose: "새카맣게 탄 프라이팬을 들고 쩔쩔맴", effect: "검은 연기, 해골 마크(💀)", dialogue: "망했다.. / 시켜먹자" },
  { id: 105, category: "디테일 일상·라이프", keyword: "음악 감상 (힐링)", expression: "눈을 감고 리듬을 타는 황홀한 표정", pose: "헤드폰을 쓰고 고개를 까딱거림", effect: "음표(🎶), 몽환적인 파동 효과", dialogue: "노래좋다 / 힐링중" },
  { id: 106, category: "디테일 일상·라이프", keyword: "게임 몰입", expression: "레이저가 나올 듯 매서운 집중 눈빛", pose: "컨트롤러나 마우스를 광클하는 포즈", effect: "불꽃 효과, 키보드/패드 잔상", dialogue: "겜하는중 / 건들지마" },
  { id: 107, category: "디테일 일상·라이프", keyword: "독서 / 자기계발", expression: "지적인 눈빛, 살짝 미소 띤 입", pose: "커피를 옆에 두고 진지하게 책을 읽음", effect: "안경 반짝임, 지혜의 전구(💡)", dialogue: "마음의양식 / 독서중" },
  { id: 108, category: "디테일 일상·라이프", keyword: "병원 / 감기몸살", expression: "힘없이 감긴 눈, 빨간 코와 창백한 얼굴", pose: "이마에 물수건을 얹고 이불 속에 누움", effect: "체온계, 약봉지, 훌쩍이는 효과", dialogue: "감기조심 / 아파요ㅠㅠ" },
  { id: 109, category: "디테일 일상·라이프", keyword: "미용실 / 스타일 변신", expression: "거울을 보며 만족스러워하는 반짝이는 눈", pose: "머리카락을 찰랑이며 포즈를 취함", effect: "반짝이 필터, 빗과 가위 아이콘", dialogue: "머리했어! / 어때?" },
  { id: 110, category: "디테일 일상·라이프", keyword: "운전 / 드라이브", expression: "신나서 콧노래를 부르는 표정", pose: "핸들을 잡고 리듬을 타며 운전하는 포즈", effect: "자동차 창문, 바람 선, 음표", dialogue: "드라이브 / 가는중!" },
  { id: 111, category: "대화 리액션·소통", keyword: "읽씹 / 안읽씹 대기", expression: "휴대폰을 뚫어져라 쳐다보는 초조한 눈", pose: "턱을 괴고 스마트폰 화면만 노려봄", effect: "1 숫자 아이콘, 째깍째깍 시계", dialogue: "답장해줘 / 왜안읽어" },
  { id: 112, category: "대화 리액션·소통", keyword: "칼답 (빛의 속도)", expression: "눈이 번쩍 뜨이며 반가워하는 표정", pose: "알림이 울리자마자 빛의 속도로 타자 침", effect: "번개(⚡), 스마트폰 알림 마크", dialogue: "칼답! / 기다렸어" },
  { id: 113, category: "대화 리액션·소통", keyword: "비밀 / 쉿!", expression: "한쪽 눈을 윙크하며 장난스러운 미소", pose: "검지손가락을 입술에 갖다 대는 포즈", effect: "자물쇠 아이콘(🔒), 쉿 효과음", dialogue: "비밀이야 / 쉿!" },
  { id: 114, category: "대화 리액션·소통", keyword: "인정 / 끄덕 (팩폭)", expression: "무표정하지만 깊이 공감하는 눈빛", pose: "엄지를 들거나 무릎을 탁 치는 동작", effect: "인정 도장 쾅!, 반짝이", dialogue: "ㅇㅈ / 팩폭이네" },
  { id: 115, category: "대화 리액션·소통", keyword: "패스 / 관심 없음", expression: "무심하게 시선을 돌리는 반눈", pose: "손을 내저으며 뒤돌아 걸어감", effect: "바람 휙 부는 효과, 먼지", dialogue: "패스~ / 안물안궁" },
  { id: 116, category: "대화 리액션·소통", keyword: "팝콘각 (관전)", expression: "흥미진진하게 반짝이는 눈, 씰룩이는 입", pose: "팝콘 통을 안고 냠냠 먹으며 지켜봄", effect: "팝콘 튀기는 효과(🍿), 집중선", dialogue: "팝콘각 / 꿀잼예상" },
  { id: 117, category: "대화 리액션·소통", keyword: "눈물 닦아주기", expression: "따뜻하고 안쓰러워하는 다정한 눈빛", pose: "손수건을 내밀어 상대의 눈물을 닦아줌", effect: "따뜻한 빛, 작은 하트(💛)", dialogue: "울지마 / 내가있잖아" },
  { id: 118, category: "대화 리액션·소통", keyword: "잔소리 듣기 싫음", expression: "귀를 막고 딴청 피우는 짜증 섞인 표정", pose: "양손으로 귀를 꽉 막고 눈을 감음", effect: "잔소리 텍스트 폭탄 튕겨냄", dialogue: "안들려~ / 그만해" },
  { id: 119, category: "대화 리액션·소통", keyword: "칭찬 감옥 (몸둘바)", expression: "부끄러워서 어쩔 줄 모르는 홍조 표정", pose: "손을 휘저으며 아니라고 손사래 침", effect: "붉어진 볼, 주변에 칭찬 반짝이", dialogue: "아이참~ / 그정도야?" },
  { id: 120, category: "대화 리액션·소통", keyword: "약속 새끼손가락", expression: "진지하고 믿음직스러운 미소", pose: "새끼손가락을 내밀어 약속을 거는 포즈", effect: "새끼손가락 끝 반짝임, 도장", dialogue: "약속해! / 꼭이야" },
  { id: 121, category: "대화 리액션·소통", keyword: "잠수 / 로그아웃", expression: "평온하게 눈을 감고 가라앉는 표정", pose: "물속이나 이불 속으로 스르르 사라짐", effect: "물방울(🫧), OFF 스위치", dialogue: "잠수탑니다 / 찾지마" },
  { id: 122, category: "대화 리액션·소통", keyword: "소환 / 호출", expression: "두 눈을 크게 뜨고 외치는 표정", pose: "확성기를 들고 큰 소리로 부르는 포즈", effect: "확성기 음파, 느낌표(‼️)", dialogue: "나와라! / 소환!" },
  { id: 123, category: "대화 리액션·소통", keyword: "눈치 챙겨 (힌트)", expression: "눈동자만 옆으로 굴리며 신호를 주는 표정", pose: "팔꿈치로 옆구리를 쿡쿡 찌르는 동작", effect: "찌릿하는 시선 화살표, 땀방울", dialogue: "눈치챙겨 / 쿡쿡" },
  { id: 124, category: "대화 리액션·소통", keyword: "할 말 잃음 (갑분싸)", expression: "얼어붙은 듯 굳은 표정, 식은땀", pose: "아무 말도 못 하고 땀만 뻘뻘 흘림", effect: "얼음 결정(❄️), 썰렁한 바람", dialogue: "갑분싸.. / 썰렁.." },
  { id: 125, category: "대화 리액션·소통", keyword: "폭풍 칭찬 / 주접", expression: "감격에 겨워 눈물까지 글썽이는 표정", pose: "양손을 모아 감탄하며 물개박수 침", effect: "후광 효과, 하트 폭포, 반짝이", dialogue: "천재야! / 폼미쳤다" },
  { id: 126, category: "계절·기념일·특수", keyword: "새해 인사", expression: "밝고 복스러운 환한 미소", pose: "한복을 입고 공손하게 세배하는 포즈", effect: "복주머니, 떡국, 까치, 반짝이", dialogue: "새해복많이 / 해피뉴이어" },
  { id: 127, category: "계절·기념일·특수", keyword: "크리스마스", expression: "설레고 들뜬 초롱초롱한 눈망울", pose: "산타 모자를 쓰고 선물 보따리를 듦", effect: "크리스마스 트리, 눈송이(❄️), 종", dialogue: "메리클스마스 / 산타왔다" },
  { id: 128, category: "계절·기념일·특수", keyword: "한파 / 겨울 무장", expression: "눈만 빼꼼 내민 귀여운 표정", pose: "두꺼운 패딩과 목도리로 꽁꽁 싸맴", effect: "입김(하~), 눈사람, 바람 효과", dialogue: "완전무장 / 얼어죽어" },
  { id: 129, category: "계절·기념일·특수", keyword: "폭염 / 선풍기 앞", expression: "혀를 내밀고 바람을 쬐는 행복한 표정", pose: "미니 선풍기나 에어컨 앞에 딱 붙어 있음", effect: "시원한 바람 선, 얼음 아이콘(🧊)", dialogue: "에어컨최고 / 살았다" },
  { id: 130, category: "계절·기념일·특수", keyword: "비 오는 날 / 우울", expression: "창밖을 보며 감성에 젖은 아련한 눈", pose: "우산을 쓰고 빗소리를 듣는 포즈", effect: "빗방울(☔), 물웅덩이, 개구리", dialogue: "비온다.. / 감성충만" },
  { id: 131, category: "계절·기념일·특수", keyword: "봄나들이 / 벚꽃", expression: "꽃잎을 보며 황홀해하는 미소", pose: "흩날리는 벚꽃 아래서 양팔을 벌림", effect: "분홍색 벚꽃잎(🌸), 햇살", dialogue: "봄이다~ / 꽃놀이" },
  { id: 132, category: "계절·기념일·특수", keyword: "가을 감성 / 독서", expression: "고독하고 분위기 잡는 진지한 표정", pose: "트렌치코트를 입고 낙엽을 밟으며 걸음", effect: "단풍잎(🍁), 커피잔, 바람 선", dialogue: "가을타나봐 / 분위기" },
  { id: 133, category: "계절·기념일·특수", keyword: "합격 / 성취 축하", expression: "감격에 겨워 만세를 부르는 환희 표정", pose: "합격 통지서나 트로피를 번쩍 들어 올림", effect: "폭죽(🎊), 금메달, 반짝이", dialogue: "합격이다! / 해냈어!" },
  { id: 134, category: "계절·기념일·특수", keyword: "이사 / 새로운 시작", expression: "설렘과 기대에 찬 반짝이는 눈", pose: "이삿짐 박스를 들고 파이팅 포즈", effect: "집 아이콘(🏠), 반짝이 효과", dialogue: "새출발! / 이사완료" },
  { id: 135, category: "계절·기념일·특수", keyword: "여행 출발", expression: "신나서 들뜬 표정, 크게 웃는 입", pose: "선글라스에 여권과 티켓을 흔드는 포즈", effect: "비행기(✈️), 구름, 지구본", dialogue: "떠납니다! / 여행시작" },
  { id: 136, category: "계절·기념일·특수", keyword: "미세먼지 / 마스크", expression: "눈을 찡그리고 답답해하는 표정", pose: "마스크를 단단히 쓰고 하늘을 올려다봄", effect: "뿌연 먼지 구름, 콜록콜록 효과", dialogue: "공기나쁨 / 마스크필수" },
  { id: 137, category: "계절·기념일·특수", keyword: "불면증 / 말똥말똥", expression: "밤인데도 눈이 말똥말똥하게 떠진 표정", pose: "침대에 누워 양을 세며 뒤척이는 포즈", effect: "양 한 마리, 시계(새벽 3시), 달", dialogue: "잠이안와 / 말똥말똥" },
  { id: 138, category: "계절·기념일·특수", keyword: "생일 주인공 (왕관)", expression: "세상에서 가장 행복하고 거만한 미소", pose: "왕관을 쓰고 턱을 치켜든 공주/왕자 포즈", effect: "생일 왕관(👑), 폭죽, 하트", dialogue: "오늘내생일 / 축하해줘" },
  { id: 139, category: "병맛·밈·과장액션", keyword: "현실 부정 (귀 막음)", expression: "눈을 질끈 감고 고개를 흔드는 표정", pose: "양손으로 귀를 막고 소리 지르며 도망감", effect: "아아아악 텍스트, 충격파 선", dialogue: "안돼애액 / 현실부정" },
  { id: 140, category: "병맛·밈·과장액션", keyword: "뇌절 / 뇌정지 오열", expression: "영혼이 빠져나간 채 기괴하게 웃는 표정", pose: "머리를 감싸 쥐고 바닥을 데굴데굴 구름", effect: "빙글빙글 소용돌이, 물음표 폭탄", dialogue: "뇌절중 / 무슨소리야" },
  { id: 141, category: "병맛·밈·과장액션", keyword: "돈벼락 기원", expression: "눈이 돈 모양(🤑)으로 변한 탐욕스러운 표정", pose: "하늘을 향해 두 팔을 벌리고 기도함", effect: "쏟아지는 금화와 지폐, 후광", dialogue: "돈벼락 / 부자되자" },
  { id: 142, category: "병맛·밈·과장액션", keyword: "벽 치기 (분노/답답)", expression: "이를 악물고 눈물을 글썽이는 표정", pose: "주먹으로 벽이나 바닥을 쾅쾅 내리침", effect: "벽에 금이 가는 효과, 충격파", dialogue: "쾅쾅! / 답답해!" },
  { id: 143, category: "병맛·밈·과장액션", keyword: "승천 (너무 좋음)", expression: "성스러운 미소를 지으며 감은 눈", pose: "몸이 둥실 떠올라 하늘로 올라가는 포즈", effect: "천사 날개, 머리 위 링, 한 줄기 빛", dialogue: "극락.. / 승천한다" },
  { id: 144, category: "병맛·밈·과장액션", keyword: "지하로 꺼짐 (창피)", expression: "사색이 되어 땅을 파고 들어가는 표정", pose: "삽을 들고 바닥을 파서 숨으려는 포즈", effect: "흙먼지, 구멍 아이콘, 땀방울", dialogue: "숨고싶다 / 쥐구멍어디" },
  { id: 145, category: "병맛·밈·과장액션", keyword: "레이저 발사 (분노)", expression: "분노로 가득 찬 흰자위 없는 붉은 눈", pose: "정면을 노려보며 눈에서 빔을 쏨", effect: "강렬한 붉은 레이저 빔, 폭발 효과", dialogue: "찌릿! / 레이저발사" },
  { id: 146, category: "병맛·밈·과장액션", keyword: "부활 / 각성", expression: "감겼던 눈이 번쩍 뜨이며 빛나는 표정", pose: "쓰러져 있다가 번개처럼 벌떡 일어남", effect: "번개(⚡), 불꽃 오라, 각성 효과", dialogue: "부활! / 다시시작" },
  { id: 147, category: "병맛·밈·과장액션", keyword: "도망 / 줄행랑", expression: "식은땀을 흘리며 뒤를 돌아보는 다급한 표정", pose: "발이 보이지 않을 정도로 빠르게 도망감", effect: "흙먼지 구름, 속도선, 땀방울", dialogue: "튀어! / 도망가자" },
  { id: 148, category: "병맛·밈·과장액션", keyword: "멱살 잡기 (장난)", expression: "장난기 가득하게 부릅뜬 눈, 씩씩거림", pose: "허공이나 상대를 향해 멱살을 잡듯 흔듦", effect: "흔들림 잔상선, 불꽃 효과", dialogue: "이리와! / 딱걸렸어" },
  { id: 149, category: "병맛·밈·과장액션", keyword: "무릎 꿇고 싹싹 빎", expression: "눈물 콧물 다 쏟으며 간절하게 애원", pose: "무릎을 꿇고 두 손바닥을 마주 대고 비빔", effect: "땀방울 폭포, 후광, 제발 텍스트", dialogue: "잘못했어 / 살려주세요" },
  { id: 150, category: "병맛·밈·과장액션", keyword: "엔딩 / 퇴장 인사", expression: "아쉽지만 시원하게 웃으며 윙크하는 표정", pose: "커튼 뒤로 사라지며 한 손으로 손인사", effect: "무대 커튼, 반짝이, 하트", dialogue: "이만총총 / 다음에봐!" },
];

/** 카테고리 20종 (화면 순서) */
export const PRESET_CATEGORIES: PresetCategory[] = [
  { id: "joy", label: "기쁨·환희·긍정", labelEn: "Joy & delight", emoji: "😄", count: 5 },
  { id: "affection", label: "애정·설렘·호감", labelEn: "Affection & flutters", emoji: "💕", count: 5 },
  { id: "sad", label: "슬픔·우울·상처", labelEn: "Sadness & hurt", emoji: "😢", count: 5 },
  { id: "anger", label: "분노·짜증·경멸", labelEn: "Anger & annoyance", emoji: "😤", count: 5 },
  { id: "burnout", label: "무기력·피로·멘붕", labelEn: "Burnout & fatigue", emoji: "🪫", count: 5 },
  { id: "shock", label: "놀람·당황·공포", labelEn: "Shock & panic", emoji: "😱", count: 6 },
  { id: "greeting", label: "인사·예의·감사", labelEn: "Greetings & thanks", emoji: "🙇", count: 5 },
  { id: "reaction", label: "긍정·거절·리액션", labelEn: "Yes, no & reactions", emoji: "👍", count: 5 },
  { id: "cheer", label: "응원·위로·축하", labelEn: "Cheer & comfort", emoji: "🎉", count: 5 },
  { id: "touch", label: "애정·스킨십", labelEn: "Affection & touch", emoji: "🤗", count: 5 },
  { id: "work", label: "직장·학교·업무", labelEn: "Work & school", emoji: "💼", count: 4 },
  { id: "hobby", label: "일상·생활·취미", labelEn: "Hobbies & daily", emoji: "🎈", count: 5 },
  { id: "envy", label: "질투·억울·승부욕", labelEn: "Envy & rivalry", emoji: "😒", count: 4 },
  { id: "curious", label: "호기심·의심·생리반응", labelEn: "Curiosity & body", emoji: "🤔", count: 10 },
  { id: "chat", label: "대화 리액션·소통", labelEn: "Chat reactions", emoji: "💬", count: 15 },
  { id: "life", label: "디테일 일상·라이프", labelEn: "Life details", emoji: "🛋️", count: 20 },
  { id: "office", label: "직장·학교·심화", labelEn: "Office deep cuts", emoji: "🗂️", count: 15 },
  { id: "season", label: "계절·기념일·특수", labelEn: "Seasons & occasions", emoji: "🎄", count: 13 },
  { id: "meme", label: "병맛·밈·과장액션", labelEn: "Meme & chaos", emoji: "🤪", count: 12 },
  { id: "motion", label: "역동적 액션·이동", labelEn: "Action & motion", emoji: "🏃", count: 1 },
];

/** 1~150 순서의 감정 축 */
const PRESET_EMOTIONS: Emotion[] = ['joy', 'smug', 'laugh', 'smug', 'joy', 'love', 'love', 'love', 'love', 'love', 'cry', 'sad', 'sad', 'sad', 'sad', 'sad', 'tired', 'tired', 'tired', 'blank', 'king', 'sulk', 'blank', 'smug', 'angry', 'angry', 'cry', 'smug', 'smug', 'surprised', 'surprised', 'surprised', 'surprised', 'surprised', 'blank', 'surprised', 'blank', 'sad', 'tired', 'sad', 'joy', 'tired', 'surprised', 'tired', 'cry', 'joy', 'joy', 'love', 'smug', 'love', 'joy', 'joy', 'joy', 'angry', 'blank', 'joy', 'love', 'laugh', 'laugh', 'sad', 'love', 'love', 'love', 'love', 'smug', 'tired', 'laugh', 'smug', 'blank', 'laugh', 'tired', 'joy', 'smug', 'smug', 'surprised', 'tired', 'smug', 'joy', 'cry', 'surprised', 'joy', 'surprised', 'sad', 'sad', 'surprised', 'blank', 'surprised', 'blank', 'laugh', 'cry', 'smug', 'smug', 'laugh', 'laugh', 'tired', 'joy', 'tired', 'joy', 'joy', 'tired', 'tired', 'joy', 'joy', 'surprised', 'joy', 'blank', 'blank', 'tired', 'smug', 'joy', 'blank', 'joy', 'smug', 'smug', 'blank', 'laugh', 'love', 'sulk', 'surprised', 'love', 'tired', 'king', 'smug', 'blank', 'cry', 'joy', 'joy', 'tired', 'tired', 'sad', 'joy', 'blank', 'laugh', 'joy', 'joy', 'blank', 'tired', 'smug', 'surprised', 'surprised', 'smug', 'angry', 'love', 'cry', 'king', 'surprised', 'surprised', 'king', 'cry', 'joy'];

const CATEGORY_EN = new Map(PRESET_CATEGORIES.map((category) => [category.label, category]));

function firstPhrase(text: string): string {
  const head = text.split('/')[0]?.trim() ?? '';
  return head || text.trim();
}

const EFFECT_RULES: [RegExp, EffectKind][] = [
  [/하트|💕|💖|💓|💗|❤|💛/, 'heart'],
  [/돈|지폐|금화|💸|🤑|지갑|동전/, 'money'],
  [/불|불꽃|🔥|레이저|태양|번개|⚡/, 'flame'],
  [/땀|💦|식은땀/, 'sweat'],
  [/분노|💢|핏줄|오라|충격파|진동/, 'anger'],
  [/반짝|✨|폭죽|🎉|🎊|⭐|별|광택|후광|꽃잎|벚꽃|눈송이|음표/, 'sparkle'],
];

/** 원본 effect 문구 → 앱 레이어 이펙트 종류 */
export function effectKindOfEffectText(effectText: string): EffectKind {
  for (const [pattern, kind] of EFFECT_RULES) if (pattern.test(effectText)) return kind;
  return 'none';
}

function bubbleFor(_emotion: Emotion): BubbleStyle {
  // 말풍선 박스는 그리지 않는다 — 화면·다운로드 모두 캘리그라피 글자만 남긴다.
  return 'none';
}

function styleFor(_emotion: Emotion): TextLayerStyle {
  // 기본값 자체를 동글 손글씨로 둔다(감정별 포인트 컬러는 레이어 렌더러가 입힌다).
  return 'round';
}

/** 150종 프리셋 (파생 필드 포함) */
export const EMOTICON_PRESETS_150: EmoticonPreset[] = PRESET_SOURCE.map((row, index) => {
  const en = PRESET_EN_COPY[row.id];
  const category = CATEGORY_EN.get(row.category);
  const emotion = PRESET_EMOTIONS[index] ?? 'joy';
  return {
    ...row,
    emotion,
    categoryEn: category?.labelEn ?? row.category,
    en,
    line: firstPhrase(row.dialogue),
    lineEn: firstPhrase(en.dialogue),
    effectKind: effectKindOfEffectText(row.effect),
    bubble: bubbleFor(emotion),
    style: styleFor(emotion),
  };
});

const PRESET_BY_ID = new Map(EMOTICON_PRESETS_150.map((preset) => [preset.id, preset]));

export const PRESET_COUNT = EMOTICON_PRESETS_150.length;

export function presetById(id: number | null | undefined): EmoticonPreset | undefined {
  if (typeof id !== 'number' || !Number.isInteger(id)) return undefined;
  return PRESET_BY_ID.get(id);
}

/** 화면에 보여줄 카테고리 이름 (영문 전환 시에도 한국어가 새지 않게) */
export function presetCategoryLabel(category: PresetCategory, locale: Locale): string {
  return locale === 'en' ? category.labelEn : category.label;
}

export function presetKeyword(preset: EmoticonPreset, locale: Locale): string {
  return locale === 'en' ? preset.en.keyword : preset.keyword;
}

export function presetDialogue(preset: EmoticonPreset, locale: Locale): string {
  return locale === 'en' ? preset.en.dialogue : preset.dialogue;
}

export function presetCaption(preset: EmoticonPreset, locale: Locale): string {
  return locale === 'en' ? preset.lineEn : preset.line;
}

/** 검색용 색인 (한국어·영문 모두) */
export function presetSearchIndex(preset: EmoticonPreset): string {
  return [
    preset.keyword,
    preset.expression,
    preset.pose,
    preset.effect,
    preset.dialogue,
    preset.en.keyword,
    preset.en.expression,
    preset.en.pose,
    preset.en.dialogue,
  ].join(' ').toLowerCase();
}

export interface PresetFilter {
  category?: string | null;
  query?: string;
}

/** 카테고리 + 키워드(한/영) 검색 */
export function searchPresets({ category, query }: PresetFilter = {}): EmoticonPreset[] {
  const needle = (query ?? '').trim().toLowerCase();
  const tokens = needle.split(/\s+/).filter(Boolean);
  return EMOTICON_PRESETS_150.filter((preset) => {
    if (category && preset.category !== category) return false;
    if (!tokens.length) return true;
    const haystack = presetSearchIndex(preset);
    return tokens.every((token) => haystack.includes(token));
  });
}

/**
 * 카테고리를 번갈아 골라 12·24컷처럼 여러 컷을 채워도 표정이 겹치지 않게 한다.
 * (같은 카테고리만 모이면 팩이 단조로워진다)
 */
export function recommendedPresetIds(count: number, exclude: number[] = []): number[] {
  const pools = PRESET_CATEGORIES.map((category) =>
    EMOTICON_PRESETS_150.filter((preset) => preset.category === category.label && !exclude.includes(preset.id)).map((preset) => preset.id),
  );
  const picked: number[] = [];
  while (picked.length < count && pools.some((pool) => pool.length)) {
    for (const pool of pools) {
      if (picked.length >= count) break;
      if (!pool.length) continue;
      picked.push(pool.shift()!);
    }
  }
  return picked;
}

/** 남은 자리를 무작위로 채운다 (이미 고른 항목은 제외) */
export function randomPresetIds(count: number, exclude: number[] = []): number[] {
  const pool = EMOTICON_PRESETS_150.filter((preset) => !exclude.includes(preset.id)).map((preset) => preset.id);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, count));
}

/** 프리셋의 대사·이펙트 레이어 (앱이 이미지 위에 합성) */
export function presetTextLayer(preset: EmoticonPreset, locale: Locale): TextLayer {
  const caption = presetCaption(preset, locale);
  return {
    id: `preset-${preset.id}`,
    text: caption,
    style: preset.style,
    bubble: preset.bubble,
    effect: preset.effectKind,
    x: 0.5,
    y: caption.length > 10 ? 0.82 : 0.85,
    size: caption.length > 9 ? 0.145 : caption.length > 6 ? 0.165 : caption.length > 3 ? 0.18 : 0.19,
    color: '#191512',
    rotate: preset.emotion === 'angry' || preset.emotion === 'king' ? -4 : -2,
  };
}

/** AI 프롬프트에 넣는 영문 지시 (표정·포즈·이펙트) */
export function presetPrompt(preset: EmoticonPreset): { expression: string; pose: string; effect: string } {
  return { expression: preset.en.expression, pose: preset.en.pose, effect: preset.en.effect };
}
