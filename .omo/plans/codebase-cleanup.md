# Codebase Cleanup Plan — doggo (Expo RN app)

## Goal
Remove redundant/dead code, deduplicate logic, consolidate duplicated types into `src/types/api.ts`, sweep hardcoded colors into theme tokens, remove debug logging (incl. access-token leak), keep `react-doctor` score >80 (baseline 83).

## Ground truth (verified)
- 116 src/ files, all reachable; entry `index.ts → App.tsx`. Do NOT touch `bones/`, `dist/`, `.expo/`, `patches/`.
- Baselines: `bunx tsc --noEmit` = 0 · `bunx biome check` = 0 · `bunx react-doctor@latest --score` = 83.
- ZERO tests; no test runner installed and no new dependencies allowed (AGENTS.md). Runtime QA is therefore limited to the strongest available non-device signals (see QA LADDER).
- NO git commits (repo practice: commit only when asked). Rollback = `git checkout -- <files>`.
- Conventions (AGENTS.md): double quotes, `import type`, relative imports only, `export default function` components, inline prop types, co-located StyleSheet, named exports for non-components, FlashList, reanimated v4, no hardcoded colors, API calls only in src/api/, no new deps, useAlert() not Alert.alert.

## QA LADDER (per task — every task names its rungs)
- **R1 static**: `bunx tsc --noEmit && bunx biome check` — expected: both exit 0 after the task.
- **R2 bundle**: `bunx expo export --platform android --output-dir /tmp/opencode/export-check` — runs Metro + babel/reanimated/worklet transforms over the whole app; catches broken imports/cycles, worklet syntax, transform errors. Expected: exit 0, bundle emitted. (~1-3 min) Run after every BATCH and after each behavioral task's batch (S6,S9,S10,S14-S23).
- **R3 diff-invariant review**: external verifier agent reads `git diff` for the task files against an explicit invariant checklist (listed per task below) and answers PASS/FAIL with evidence. This substitutes for unit tests: it proves semantic equivalence by construction-review, not by execution.
- Baseline snapshot before Batch 1: `bunx expo export` once on pristine tree to confirm R2 passes pre-change (rules out pre-existing bundle failures).

## Per-task QA scenarios (tool + concrete steps + expected result)

| Task | R1 | R2 | R3 invariant checklist (verifier must confirm in diff) |
|---|---|---|---|
| S1 | ✓ | — | ModalHandle gone; useModalHandle hook signature/body byte-identical otherwise; zero remaining refs repo-wide (`grep -r ModalHandle src/`) |
| S2 | ✓ | — | Only console.log/error lines removed + now-dead guard vars if trivially orphaned; NO logic lines removed; authStore.ts:180 token log gone; chats.ts:384 console.error still present |
| S3 | ✓ | — | 6 new tokens added with EXACT literal values from spec; existing tokens untouched |
| S4 | ✓ | — | Every replaced site uses the token whose value equals the deleted literal (spot-check ≥5 diffs); no other style props changed |
| S5 | ✓ | — | Only `export` keyword dropped; declarations intact; tsc proves no external importer existed (it would fail compile otherwise) |
| S6 | ✓ | ✓ | Usage inventory printed BEFORE edit; every consumer of ProxyConfiguration/GenerationSettings compiles against merged type with ZERO object-literal key changes at runtime boundaries; if any camelCase→snake_case key change would reach a request body → task aborts with documentation instead of merge |
| S7 | ✓ | — | Types moved verbatim (no field edits); all importers updated mechanically; api/*.ts re-import from ../types/api; no type body differs beyond formatting |
| S8 | ✓ | — | Derived types are structural supersets/equivalents of originals (tsc enforces); UI option lists render same keys (diff shows only type-level edits) |
| S9 | ✓ | ✓ | Factory output field-for-field identical to deleted literals; chatStore character literal now contains creator_id/creator_name matching ChatListItem.character; cast removed OR documented why still needed |
| S10 | ✓ | ✓ | Built URL/query keys UNCHANGED: grep diff proves proxyenabled/tag param names identical post-refactor; types derived via Pick/Omit only |
| S11 | ✓ | — | Output strings identical for sample inputs: <1min ago, 5min, 2h, yesterday, 6days, 8days boundary (verifier traces both code paths in diff) |
| S12 | ✓ | ✓ | buildParams/buildSwipeParams produce identical query objects (verifier compares assembled param sets pre/post for: search+tags+filters case, swipe default case); filterDisplayCharacters string template unchanged |
| S13 | ✓ | ✓ | Same AsyncStorage keys (grep diff: key strings unchanged); defaults unchanged; chatStore state shape unchanged |
| S14 | ✓ | ✓ | Alert titles/messages/buttons text IDENTICAL to old manual calls (diff side-by-side); CustomAlert rendered in screen root JSX; alert triggers fire on same conditions |
| S15 | ✓ | ✓ | Block flow order preserved: getBlockedContent → push id → updateBlockedContent → navigate; long-press opens same sheet with same actions list |
| S16 | ✓ | ✓ | Gesture math copied verbatim into shared hook (verifier line-compares shared values/snapToTab); both screens pass equivalent tab counts; indicator animation props unchanged |
| S17 | ✓ | ✓ | Delete confirm alert copy identical; open-create/open-edit set same fields; no store call signature changed |
| S18 | ✓ | ✓ | fetchPersonaField pipeline order identical: fetchSystemPrompt → processSystemMessage → generify(cleanTags(...)) with attemptExtractSystemPrompt fallback; same fallback condition |
| S19 | ✓ | ✓ | Same manipulate params (256×256 webp), same uploadFile/XHR PUT URL+headers+method; error paths preserved |
| S20 | ✓ | ✓ | Per-hook behavior matrix verified: initial load dispatch sequence, pull-to-refresh reset path, endOfListReached threshold (3 empty pages), loadingMore guard, RESET-on-param-change — all identical in diff; hooks.tsx exports unchanged signatures |
| S21 | ✓ | — | EmptyState renders same text/style values as deleted inline versions; RefreshControl memo props identical (tintColor colors.accent etc.) |
| S22 | ✓ | — | Row renders Avatar source/name/chat_count identically; onPress wiring unchanged |
| S23 | ✓ | ✓ | IF attempted: challenge-retry wrapper semantics identical (401/challenge detection + retry count); ELSE skip documented in plan file with coupling reason |

**Batch gates**: end of Batch 1/2/3 run R1 + R2 + `bunx react-doctor@latest --score` (≥80). Any FAIL → revert that batch's failing step via git checkout, re-verify, document.

## Steps

### BATCH 1 — mechanical, fully parallel (all `quick`)
- **S1** Delete dead `ModalHandle` interface — `src/hooks/useModalHandle.ts:8`.
- **S2** Remove debug logs (keep error-path `console.error` at `src/api/chats.ts:384`; DELETE access-token log `src/stores/authStore.ts:180-181`; remove per-token log `src/api/chats.ts:376`): files = api/auth.ts(:31,41,51,61), api/chats.ts(:219,220,376), api/client.ts(:25,41), hooks/useChat.ts(:51,58), screens/auth/LoginScreen.tsx(:44,51), screens/chats/chatScreen/useChatScreen.ts(:284), stores/authStore.ts(:56,62,66,148,173,180,200).
- **S3** Add tokens to `src/utils/colors.ts` (exact values): `overlayStrong:"rgba(0,0,0,0.8)"`, `overlayMedium:"rgba(0,0,0,0.6)"`, `accentStrong:"rgba(124, 92, 231, 0.3)"`, `accentSoft:"rgba(124, 92, 231, 0.15)"`, `dangerSoft:"rgba(231, 76, 60, 0.15)"`, `scrim:"rgba(30, 30, 40, 0.4)"`.
- **S4** Color sweep A (replace literal → token, zero visual change): ReportModal:219, ProxyEditModal:170, PromptSelectorModal:320, SystemPromptModal:151, createBot/fields.tsx:507, CharacterSettingsModal:88, SettingsScreen:509, EmojiPickerModal:145, CustomBottomSheet:156, TagsModal:211, FilterModal:253, AdvancedSearchModal:271+280+325, Tag.tsx:66+77, generationSettings/sections.tsx:627+640+787, Slider.tsx:111, CharacterCard.tsx:94, SwipeCard.tsx:152.
- **S5** Un-export internal-only symbols NOT moved later: searchUtils.ts ListState:32/ListAction:41/SwipeParamsInput:264; sheetStore.ts SheetEntry:4; PersonaPicker.tsx PersonaEntry:17; CharacterSearchScreen.tsx useDiscoverSearch:70; sse.ts StreamRequestOptions:141.

**VERIFY BATCH 1**: tsc + biome + react-doctor score.

### BATCH 2 — type consolidation (`quick` unless noted)
- **S6** api.ts intra-file twins: merge `ProxyConfiguration`(:299, camelCase) → `ApiProxyConfig`(:317) and `GenerationSettings`(:381) → `ApiSettingsGeneration`(:340). FIRST inspect all usages; if any usage constructs camelCase objects sent to backend (runtime key change), STOP and document instead of merging. (`unspecified-low`)
- **S7** Move named types from src/api/*.ts → src/types/api.ts (absorbs remaining un-exports): characters.ts (CharacterSearchParams:10, CharacterSettingsPatch:77, MyCharactersParams:94, TagSuggestionsResponse:99, CharacterAvatarPreview:151, ProfileSearchResult:159, ProfileSearchResponse:171, name inline `{characterId,favoritesCount}`:144 as FavoriteCountResponse); profile.ts FollowingEntry:164 + inline bodies → named req types (UpdateMainPersonaBody:27, ReorderPersonasBody:64, PersonaGroupBody:91+112, ReorderGroupsBody:122); settings.ts inline bodies → CreateProxyConfigBody:26, UpdateProxyConfigBody:43, PromptBody:65+79, DeletePromptResponse:88; reviews.ts ReviewSort:14, GetReviewsParams:16 + TranslateCommentResponse:119 + ReportCommentBody:127; chats.ts EditMessageBody:68 + ClearResetMessagesBody:155 + SystemPromptRequestBody:273+342. Update imports everywhere.
- **S8** Subset-type merges: `PersonaRef`(api.ts:644) & `PersonaEntry`(PersonaPicker.tsx:17) → single derived `Pick<Persona,...>` in api.ts; `GroupForm`(PersonaGroupSheet.tsx:30) → `Pick<PersonaGroup,"name"|"description"|"color">`; shared `{key,label}` option-row type for WrapperOption(SettingsScreen:49)/PickerOption(:62)/SuggestionItem(BlockedContentScreen:36); reuse `DiscoveryMode`(CharacterSearchScreen.tsx:57) in characterSearch/components.tsx:43+160.
- **S9** Optimistic-literal cleanup: extract small `makeReviewUserProfile()` factory (or inline typed const) using existing `ReviewUserProfile`; apply in ReviewsSection.tsx:228-234 + ReviewCard.tsx:357-363. Fix chatStore.ts:146-166 `as ChatListItem` cast — complete the character literal with creator_id/creator_name (check optional-ness first; keep cast only if still required).
- **S10** Align navigation/types.ts DiscoverParamsLike/SwipeDiscoverParams(:16-34) with api CharacterSearchParams — derive via Pick/Omit from one canonical shape; preserve exact runtime payloads (renames proxyenabled↔is_proxy_enabled, tag↔tag_id must remain byte-compatible in built URLs).

**VERIFY BATCH 2**: tsc + biome + react-doctor score.

### BATCH 3 — logic dedup (`unspecified-low`, behavior-preserving; sequential where files overlap)
- **S11** `src/utils/time.ts`: formatRelativeTime(:1-14) delegates to formatRelativeExtended internals (:16-35).
- **S12** `searchUtils.ts`: extract shared tag/filter param builders used by buildParams(:91-141) + buildSwipeParams(:274-316); collapse triple `split(",").flatMap(trim)` in initialTagsFromParams(:222-236); dedupe filterDisplayCharacters text template (:176/:188).
- **S13** `storage.ts` pref factories (createBooleanPref/createStringPref/createJsonPref) (:82-224) + adopt in chatStore setX/loadX pairs (:241-303).
- **S14** useAlert migration (kills manual alert state): MyCharactersScreen.tsx(:51-54,156-180), CreatorScreen(alertVisible block ~600-660), useCreateBotForm.ts(:50-63,318-339,438-462) → `useAlert()` from src/hooks/useAlert.ts. Screens own CustomAlert instance per AGENTS.md.
- **S15** (blockedBy S14 — same files) Block/long-press consolidation: MyCharactersScreen.handleBlockCharacter → existing `useBlockAlert` (characterSearch/hooks.tsx:149-183); long-press machine in CreatorScreen + MyCharactersScreen → generalize `useLongPressActions`(:258-309).
- **S16** Extract `src/hooks/useTabSwipe.ts` from the two near-identical implementations: BlockedContentScreen.tsx:53-142 + myPersonas/hooks.ts:33-113. REANIMATED V4 worklets — copy math verbatim, parameterize tab count.
- **S17** myPersonas/hooks.ts: dedupe usePersonaSheet/useGroupSheet (:115-273) — extract shared delete-confirm + open-edit logic.
- **S18** Extract `fetchPersonaField(detail, tag, fallbackTag)` helper: useLocalSettings.ts handleFetchPersonality(:89-125)/handleFetchScenario(:127-159); reuse in useChatScreen.ts system-prompt pipeline (:217-343) ONLY where identical.
- **S19** Extract avatar upload helper (ImagePicker→manipulate 256×256 webp→uploadFile→XHR PUT) into src/api/ ; adopt in useCreateBotForm.ts(:198-248) + PersonaSheet.tsx(:374-425). (blockedBy S14 for useCreateBotForm)
- **S20** BIGGEST/RISKIEST: extract `usePaginatedFetch(fetchFn,…)` from useCharactersList(:311-429)/useSwipeDeck(:431-566)/useCreators(:185-256) in characterSearch/hooks.tsx. Preserve exact guard semantics (pageRef/loadingMoreRef/emptyPagesRef/reachedEndRef, 3-empty-pages stop, RESET/LOADING/REFRESHING/LOADED). Careful human-grade diff review.
- **S21** Lift `EmptyState` (from BlockedContentScreen.tsx:210-216) + shared `refreshControl` memo to src/components/common/; adopt in cards.tsx(:43-52,117-126), ChatListScreen(:570-579), MyCharactersScreen(:106-116) + empty states (~7 sites).
- **S22** Dedupe chat row: ChatListScreen.CharChatRow(:504-532) ≡ AllChatsSheet.renderRow(:28-64) → one shared row component used by ChatsSheet.
- **S23** OPTIONAL (document-if-skipped): ChatListScreen consume `useChat()` instead of re-wrapping withChallengeRetry (:60-90). Assess coupling first; skip with note if useChat's active-chat assumptions don't fit.

**VERIFY BATCH 3**: tsc + biome after EVERY step; react-doctor after S16, S20, and batch end.

### FINAL
- Full suite: `bunx tsc --noEmit` · `bunx biome check` · `bunx react-doctor@latest --verbose --score` ≥80 · `lsp_diagnostics` on changed dirs.
- Summary of changes w/ file:line refs.

## Rollback
Per-step: `git checkout -- <step files>`. Abort conditions: 2 consecutive verification failures on one step, any react-doctor dip <80, any behavioral ambiguity in S6/S10/S20 → stop, revert, document.

## Team Staffing Recommendation
- total_atomic_steps: 23
- file_independent_steps: 17 (S1-S5 pairwise-disjoint files; S6-S13 disjoint post-Batch-1; S16,S17,S18,S22 isolated)
- cross_file_dependent_steps: 6 (S14→S15, S14→S19, S9→S13 chatStore chain, S5→S12 searchUtils chain, S21/S23 multi-file screens)
- per_step_assignment: S1[quick], S2[quick], S3[quick], S4[quick], S5[quick], S6[unspecified-low], S7[quick], S8[quick], S9[unspecified-low], S10[unspecified-low], S11[quick], S12[unspecified-low, blockedBy S5], S13[unspecified-low, blockedBy S9], S14[unspecified-low], S15[unspecified-low, blockedBy S14], S16[unspecified-low], S17[unspecified-low], S18[unspecified-low], S19[unspecified-low, blockedBy S14], S20[unspecified-low], S21[quick], S22[quick], S23[unspecified-low]
- dispatch_path_recommendation: **team** — ≥3 file-independent steps, large mechanical surface (S1-S5, S7, S21-S22) ideal for 2 quick workers while 2 unspecified-low workers take reasoning steps; external `deep` verifier owns tsc/biome/react-doctor between batches.
- rationale: 2 quick (volume: ~60 mechanical edit sites) + 2 unspecified-low (hook/type reasoning); lead orchestrates + verifies externally; batch-boundary verification keeps react-doctor gate honest.
