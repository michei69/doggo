---
target: src/screens (full app)
total_score: 23
p0_count: 0
p1_count: 5
timestamp: 2026-08-21T18-52-32Z
slug: src-screens-full-app
---
# UX Critique — doggo (Expo RN, dark character-chat app)

Method: dual-agent (A: design review · B: deterministic evidence)

## Design Health Score: 23/40 (Acceptable — significant improvements needed)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Block action gives no feedback; send failures swallowed |
| 2 | Match System/Real World | 2 | Unexplained domain jargon (proxy, limitless, narration style) |
| 3 | User Control & Freedom | 3 | No undo for swipe-hide; deck advance before chat create |
| 4 | Consistency & Standards | 2 | Two back patterns, three chevron glyphs, modal vs sheet split |
| 5 | Error Prevention | 3 | Last-message delete has no confirm; report form silently blocks |
| 6 | Recognition over Recall | 2 | All context actions long-press-only, zero affordance |
| 7 | Flexibility & Efficiency | 3 | Good gestures, but no jump-to-latest, no bulk select |
| 8 | Aesthetic & Minimalist | 2 | Uniform card recipe, hardcoded paddingTop 50/60 |
| 9 | Error Recovery | 2 | Raw err.message in bubbles vs friendly store errors |
| 10 | Help & Documentation | 1 | No onboarding/tooltips/help; About shows wrong brand |

## Anti-Patterns Verdict
Borderline-generated: competent boilerplate chrome around a genuinely crafted chat engine. Uniform card+border+radius-12 recipe everywhere, one accent doing all work, generic one-line empty states, placeholder About ("Janitor AI"), two back-button patterns. Deterministic scan: detector returned [] (HTML/CSS-only, N/A for native RN) — all evidence below is static grep/computed.

## Deterministic Evidence (Assessment B)
- **Accessibility: 0 of 202 Pressables carry any accessibility prop** (label/role/hint = 0 repo-wide); hitSlop used twice.
- **Contrast failures (WCAG):** textDimAlt #555 on card = **2.29** (chat composer placeholder ChatInput.tsx:57, TextInput.tsx:38); textDim #666 on card = **2.97** (stat labels, dates); accent body-size text = 4.12 (<4.5); user-bubble links #82b1ff on accent = **2.13**; white-on-danger = 3.82.
- **Touch targets:** 10 icon-only buttons at 36–40px with no hitSlop (back arrows, X closes, Globe, Filter, Heart, Send/Stop).
- **Reduced motion: not respected** — 26 withTiming/withSpring sites, 0 ReduceMotion checks.
- **Haptics: none** (expo-haptics not installed).
- **State coverage gaps:** ProfileScreen swallows fetch errors → infinite skeleton (catch {} :103); ChatScreen has no empty-message state; CharacterScreen no empty-chats state; MyPersonasScreen no error state.

## Priority Issues
- **[P1] Accessibility is structurally absent** — every icon button unlabeled; screen-reader users cannot use the app at all. Fix: add accessibilityRole+Label to the 11 icon-only buttons first, then tab bar and rows.
- **[P1] Silent chat death** — proxy-blocked characters disable input behind an unexplained banner; send/generate failures hit `catch {}` leaving user message unanswered (useChatScreen.ts:188, useChat.ts:189). Fix: actionable inline error + retry row instead of raw `Error:` bubble.
- **[P1] Contrast below WCAG** — body-size textDim/textDimAlt pairs fail at 2.29–3.31. Fix: lift textDim→textMuted (#aaa, 8.19) for body text; brighten composer placeholder.
- **[P1] Discover error dead-end** — initial-load error renders red text only, refreshControl unmounted (cards.tsx:51-56). Fix: reuse ChatListScreen error+Retry pattern (:265).
- **[P1] Block character is invisible** — server updated, list unchanged, no toast (hooks.tsx:162-171). Fix: optimistic removal or toast confirmation.
- **[P2] Gesture layer undiscoverable + irreversible** — long-press-only actions, swipe-to-hide persists instantly with no undo (CharacterCard.tsx:29-36). Fix: first-run hint + undo toast.
- **[P2] Touch targets 36–40px** on 10 primary controls. Fix: standardize 44px min or hitSlop.
- **[P2] Reduced-motion ignored** (26 animation sites). Fix: ReduceMotion.System in shared animation helpers.
- **[P3]** Haptics absent; two back-button styles; About shows "Janitor AI" placeholder; no forgot-password; copy-message lacks feedback; settings sheet 8 ungrouped actions; safe-area paddingTop hacks.

## Personas
- **Casey (one-handed):** header controls ~35px above thumb zone; tiny back targets; FAB ok (52px).
- **Jordan (first-timer):** no onboarding, jargon everywhere, gestures invisible, generic empty states give no next step.
- **Sam (screen reader):** completely blocked — zero accessible elements in the app.
- **Riley (stress-tester):** empty catches desync UI/server; reroll spam can trigger concurrent generations; failed chat-create loses the deck character.

## Strengths
1. Streaming chat engine (token buffer, thinking collapse, typing dots, variant nav) — genuinely polished.
2. Optimistic UI with rollback + guarded double-tap/pagination refs.
3. Thorough destructive confirmations + platform-correct Android-back/iOS-swipe sheet interception.

## Questions to Consider
- What if blocking/unhiding were as visible as favoriting?
- Does the settings surface need to assume proxy expertise, or can jargon be explained inline?
- What would a branded first-run moment look like?
