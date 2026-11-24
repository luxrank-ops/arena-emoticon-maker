# Standard pack catalog and content data

**Owner:** Product / Market + Studio engineering

**Source of truth:** `src/data/standardized-packages.ts`, `src/data/curation-packages.ts`, `src/data/emoticon-presets-150.ts`

**Validation:** `npm run test:curation`

## Scope and data provenance

This catalog is an editorially curated product dataset, not a scrape of a competitor's stickers or a claim about measured market share. It reuses the repository's 150 structured master presets (expression, pose, effect, emotion and bilingual caption) and adds bilingual pack intent, ordering, standard labels and selected caption overrides. The original master rows remain unchanged. The user's supplied 12 high-frequency topics define the required core slots; usage analytics can later tune ordering with consent-safe aggregate events.

- 12 one-tap curated sets contain **296 cut placements**: eleven 24-cut sets and the existing 32-cut everyday/meme set.
- Nine additions contribute 216 placements: one core pack, six seasonal packs, one friend/group-chat pack and one dedicated team/department pack.
- Existing couple (24), office-survival (24) and everyday/meme (32) packages remain available; the focused team/department chat pack is an additional relationship set.
- Separate specialized formats remain **12 cuts each**: duo chemistry and pet-butler memes. Those preserve their existing two-photo/pet-photo validation and preview/unlock flow.
- Korean and English intent copy is included for every curated cut. English pages use localized pack names, captions, labels and intents.

## Standard core — 24 cuts

The first 12 slots are fixed in the requested order. The next 12 add common conversation bridges so the set works beyond isolated emotions.

| Order | Standard slot | Master preset | Canonical caption |
| ---: | --- | ---: | --- |
| 1 | ㅋㅋ | 3 | ㅋㅋ |
| 2 | ㅇㅋ | 52 | ㅇㅋ |
| 3 | ㄴㄴ | 54 | ㄴㄴ |
| 4 | 감사 | 50 | 고마워! |
| 5 | 미안 | 149 | 미안해 |
| 6 | 축하 | 59 | 축하해! |
| 7 | 힘내 | 56 | 힘내! |
| 8 | 퇴근 | 67 | 퇴근! |
| 9 | 출근 | 66 | 출근... |
| 10 | 멍 | 19 | 멍... |
| 11 | 심쿵 | 7 | 심쿵! |
| 12 | 분노 | 21 | 분노! |

Companion cuts: friendly hello (46), polite greeting (47), agreement (53), playful pass (55), recognition (114), comfort (57), applause (58), hug (62), missing-you check-in (10), hurt (13), awkward surprise (31), and low-battery tiredness (17).

Captions for the first 12 are pack-specific overrides. Their drawing instructions, expressions and effects continue to come from the selected master preset. The package ID is sent to the server, validated against the catalog, and stored on the generated pack; arbitrary client-supplied caption overrides are not accepted.

## Seasonal sets — 24 cuts each

| Catalog ID | Pack | Editorial coverage |
| --- | --- | --- |
| `year-end` | 연말·크리스마스 | Gift exchanges, thank-you notes, year-end dinner, leave/travel, winter and early New Year wishes. `recommendedMonth: 12`. December angle is intentionally **gift → year-end gratitude → New Year greeting**. |
| `new-year` | 새해·새출발 | New Year wishes, resolutions, study/workout goals, encouragement, winter plans and reset moments. |
| `lunar-new-year` | 설날·명절 | Hanbok greeting, sebae, family wishes, rice-cake soup, gifts/pocket-money jokes, travel, family gatherings and post-holiday recovery. |
| `exam-season` | 시험·면접 파이팅 | Study, interview nerves, coffee, brain freeze, result reveal, passing, disappointment and encouragement. |
| `monday-blues` | 월요병 생존 | Sunday-night dread, commute, lateness, coffee, meetings, workload and the eventual clock-out. |
| `overtime` | 야근 생존 | Late work, urgent requests, coffee/dinner breaks, approval waits, coworker solidarity and the ride home. |

The year-end pack has a machine-readable `recommendedMonth: 12` as well as explicit Korean/English angle copy, so future discovery/ranking can surface it seasonally without rewriting the source content.

## Relationship packs

| Relationship | Existing/added set | Size | Notes |
| --- | --- | ---: | --- |
| Couple | `couple-sweet` | 24 | Affection, teasing, sulking, reconciliation, dates and goodnight. The separate two-person chemistry format is 12 cuts and needs two photos. |
| Friends | `friends-group` | 24 | Chat openers, accept/decline, memes, meals, check-ins, encouragement, birthdays and sign-off. |
| Team / department | `team-department` | 24 | Dedicated team-chat content with 24 situation-specific bilingual captions for task receipt, review requests, meetings, handoffs, schedule changes, leave, appreciation and team coordination. |
| Workplace survival | `office-survival` | 24 | Existing 5:5 mix of workplace manners and coworker solidarity remains available as a broader office-life set. |
| Pet | `pet-meme` | 12 | Dedicated pet-photo format with butler humor, treats, walks, cuddles and reactions; remains separate from human preset composition. |

The 32-cut everyday/meme package remains under the Everyday filter for cross-context group chats and general reactions.

## Implementation contract

- `/presets` provides group filters, cut-by-cut bilingual intent and a one-tap path into creation.
- The standard core 24-cut package is preselected for ordinary (non-format, non-photo-sticker) pack creation. Other sizes and manual preset composition remain available.
- The free preview uses the first 12 cuts of the selected catalog set; paid generation uses its full catalog size. Preview remains 12 cuts and is not charged credits.
- `createPack` resolves a validated `curationPackageId`, preserves source `presetId`s and order, applies catalog label/caption overrides to both frame metadata and editable text layers, and stores the selected catalog ID.
- Catalog data integrity tests lock package order, unique IDs per pack, master preset integrity, bilingual intent completeness, requested core-slot order, the December angle and actual frame generation behavior.

## Follow-up measurement

The 12 requested core slots are product requirements, not evidence of measured relative frequency. After launch, compare aggregate selection, completion and export rates by package/cut. Keep raw photos and user-written private messages out of analytics. Update rankings only from aggregate product usage and preserve the fixed core slot contract unless the product brief changes.
