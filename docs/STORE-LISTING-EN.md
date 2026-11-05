# EmotiHak — English Play Store listing draft

> Draft prepared 2026-11-05. This is copy for review, **not a production-release approval**. Do not publish it until the English UI, legal text, support coverage, payment/license behavior, and target-country checks below are complete.

## Store metadata

- **App name:** EmotiHak — AI Stickers
- **Suggested category:** Art & Design or Personalization (confirm in Play Console)
- **Suggested audience:** Adults and older teens; confirm through the content-rating questionnaire
- **Default text language:** English (United States)
- **Package:** `com.emotihak.app`
- **Support email:** `luxrank@gmail.com` (replace if a dedicated English support mailbox is configured)
- **Privacy URL:** `https://emotihak.com/en/privacy` — reviewed English policy required before submission
- **Account-deletion URL:** `https://emotihak.com/en/account-deletion` — reviewed English page and working deletion flow required
- **Ads declaration:** No ads in the current implementation; verify SDKs and Console declaration before submission

### Short description

```text
Turn one photo into AI stickers with custom captions and 11 art styles.
```

### Full description

```text
One photo. A whole pack of you.

EmotiHak turns a favorite photo of you or your pet into expressive AI stickers for everyday chats. Choose a look, preview your character, pick your reactions, and make every caption your own.

CREATE YOUR PACK
• Start with one bright, front-facing photo
• Preview three AI character drafts before creating a full pack
• Choose from 11 art styles, including 2D character, doodle, clay, pixel art, sketch, and watercolor
• Build 12- or 24-cut character packs, or 12- or 16-cut photo-sticker packs
• Pick from 24 comic reactions or let EmotiHak compose the pack for you

MAKE IT PERSONAL
Edit captions, expressions, and accessories. Regenerate an AI cut when you want its image to reflect your changes, then download individual PNGs, a GIF, or the complete pack as a ZIP.

PAID APP MODEL
The paid app includes the style and pack features without selling additional digital credits in the app. AI generation is subject to a daily fair-use limit to keep the service reliable. It is not an unlimited-generation service. The separate web service may use a different credit model.

PHOTOS, AI, AND CONTROL
Original photos are not stored on our servers. Photos and selected character drafts are sent to Google Gemini for pre-generation review and image creation. Generated drafts and stickers are saved so you can access your pack. AI results vary and may not exactly match the photo or your requested caption; review each result before sharing.

You can report inappropriate generated results from a sticker. Account and associated-data deletion is available through the account-deletion page, subject to legally required records and unresolved transactions.

EmotiHak is not an official KakaoTalk emoticon-store product. Downloaded images can be shared in supported chats. Store submission or approval by a third-party emoticon marketplace is not guaranteed.
```

## Keyword and screenshot brief

**Keyword themes (natural copy only; do not stuff the description):** AI sticker maker, photo stickers, personal reactions, custom captions, pet stickers, character stickers, PNG sticker pack.

**English screenshot order:**

1. Hero: “One photo. A whole pack of you.” — real character drafts, no fabricated before/after identity claim
2. Style picker: “11 ways to look like you”
3. Reaction picker: “24 reactions written for real chats”
4. Editor: “Your caption, your expression” — only after the editor itself is fully English
5. Pack/export: “Download PNG, GIF, or the full pack”
6. Privacy/control: “Original photos are not stored” — include the Gemini processing disclosure nearby

Use actual English-device captures. Remove Korean UI, debug data, real customer photos, personal email addresses, and unapproved testimonial or ranking claims.

## Console worksheet — requires verification

### Data safety starting points

- **Photos:** user-selected photos are processed for pre-generation review and AI generation and sent to Google Gemini; original photos are not stored by EmotiHak. Confirm the final SDK/network inventory before answering “collected” and “shared.”
- **Generated content:** character drafts, stickers, pack settings, and generation status are stored with the user’s packs.
- **Account/session data:** account identifiers, sign-in credentials where applicable, sessions, credits/orders, content reports, and Play fair-use counters may be processed. Match each field to the actual production backend.
- **Deletion:** document automatic face-analysis deletion, user-requested account deletion, retained legal/financial records, and unresolved-transaction blocks accurately.
- **Security:** declare encryption in transit only after production verification. Do not infer independent security certification from HTTPS.

### Pricing and country rollout

- **Price hypothesis only:** US$2.99 one-time paid download. This is not a measured optimum or an approved launch price.
- Recalculate country prices after verifying Gemini cost per successful pack, Play fees/taxes, refund rate, support cost, and the daily fair-use cap.
- Start with a limited internal/closed-track country set only after English support and legal review are staffed. Do not enable worldwide sales or paid ads from this draft alone.

## Release blockers / native review

- [ ] Finish and native-review all English flows, including authentication, editor, errors, checkout/account pages, support, privacy, terms, refunds, and account deletion.
- [ ] Verify every visible English string, consent label, error state, accessibility label, and screenshot on a real device; check long captions and text wrapping.
- [ ] Complete legal review for target countries, consumer/auto-renewal rules where relevant, privacy/overseas processing, business disclosures, tax, and refund language.
- [ ] Staff English support and publish response hours/escalation rules. Never send user photos, private dialogue, or generated email content to localization connectors.
- [ ] Verify real production persistence, real payment/cancellation/refund behavior, Play purchase/license verification, and access revocation after refunds. UA-based TWA detection is not proof of purchase.
- [ ] Build and sign the AAB, verify Asset Links and the Play app-signing certificate, and test installation/deep links on real devices.
- [ ] Run real Gemini generation for person and pet packs, English exact-caption checks, failure/retry behavior, fair-use limits, reporting, moderation, and account deletion.
- [ ] Complete Play Data safety, content rating, ads, app access, target audience, generated-AI declarations, and final store review.

**Go/no-go rule:** this English foundation and store draft do not establish overseas production readiness. Advertising remains deferred until verified purchase activation and unit economics are available.
