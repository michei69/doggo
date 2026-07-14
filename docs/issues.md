# doggo — known issues

## 1. discover page has duplicate bot entries

**File:** `src/screens/characters/CharacterSearchScreen.tsx`

The API returns paginated results for trending/search, but the client never deduplicates by `character.id` when appending pages. If the same bot appears in consecutive pages (e.g. because the API's sort order shifts between requests, or due to pagination race conditions), it gets added to the list a second time.

**Location:** `doFetch` appends `[...prev, ...response.data]` without checking for existing IDs.

---

## 2. discover page scrolling broken (weird spacing)

**File:** `src/screens/characters/CharacterSearchScreen.tsx`

The FlashList `contentContainerStyle` or the CharacterCard `marginVertical` / `marginHorizontal` values interact badly with the list's estimated item size. Likely the `estimatedItemSize` prop on FlashList is missing or set incorrectly for the current card layout, causing FlashList to miscalculate cell heights and produce gaps or overlap.

**Location:** Look at the FlashList config in the search screen, and the CharacterCard styles at `marginVertical: 6, marginHorizontal: 16` which might not match what FlashList expects.

---

## 3. creator page has no character filters

**File:** `src/screens/profile/CreatorScreen.tsx`

The creator page (`CreatorScreen`) loads characters via `getCharacters({ user_id: [userId], sort: "latest" })` but has no filtering UI. The FilterModal and AdvancedSearchModal are only wired up on the main discover/search screen (`CharacterSearchScreen`). The creator page just shows a flat list sorted by latest with no way to filter by message count, token count, proxy, tags, or keywords.

**Location:** The FlashList at line 344 has no filter button/ref. Compare with `CharacterSearchScreen` which wires `filterModalRef` and `advancedSearchRef`.

---

## 4. creator page uses display name instead of username

**File:** `src/screens/profile/CreatorScreen.tsx`

The header at line 264 displays `profile.name` (display name) but doesn't substitute it for `profile.user_name` (the @handle) when the display name is blank/null. On JanitorAI, character cards show "by @username" in the card, but the creator page title/header shows the display name without falling back to the username if the display name is empty.

**Location:** Line 264 — `{profile.name}` should fall back to `profile.user_name` if `profile.name` is falsy.

---

## 5. not all username entries show the janitor+ icon

**Files:** Various

The Janitor+ / subscriber badge appears in some places (e.g. `CreatorScreen` line 271-275 checks `profile.subscriber_badge`) but is missing from other locations where usernames are displayed — most notably on CharacterCard (which doesn't show any subscriber badge on the creator name line at all, only a basic verified checkmark).

**Location:** `CharacterCard.tsx` line 84 only checks `creator_verified` for a simple checkmark. No subscriber badge is rendered. Also check other username display locations for missing subscriber/plus badges.

---

## 6. janitor verification icon is inconsistent across usernames

**Files:** Various

The verified checkmark uses `creator_verified` in CharacterCard (`line 84: character.creator_verified ? " ✓" : ""`) but other places might check `is_verified` on the user profile object instead, or not show it at all. The icon rendering (style, position, color, symbol) may differ between the discover page, character page header, creator page, and chat bubble header.

**Location:** Cross-reference `creator_verified`, `is_verified`, and any verification rendering across `CharacterCard`, `CharacterHeader`, `CreatorScreen`, and `ChatBubble` for consistency.

---

## 7. blocked keywords filter ignores custom tags

**File:** `src/screens/characters/CharacterSearchScreen.tsx` (lines 421-427)

The blacklist filter builds a searchable text from `c.name`, `c.description`, and `c.tags.map(t => t.name)` but **omits `c.custom_tags`**. So a keyword blacklisted by the user won't match against custom tags set by the bot creator, making the blocked keywords filter incomplete.

**Fix needed:** Add `(c.custom_tags || []).join(" ")` to the `text` variable at lines 424:
```ts
`${c.name} ${c.description || ""} ${(c.tags || []).map((t) => t.name).join(" ")} ${(c.custom_tags || []).join(" ")}`.toLowerCase()
```

This applies to both the keywords filter (line 412) and the blacklist filter (line 424).

---

## 8. format markdown doesn't normalize curly quotes

**File:** `src/utils/processText.ts`

The `processText` function normalizes some quote characters at line 38:
```ts
const normalized = processed.replace(/[«"„‟⹂❞❝]/g, '"');
```

But this regex does NOT include the common smart/curly quote variants: `"`, `"`, `'`, `'`, `‚`, `‛`, `‹`, `›`, `»`. When the AI model outputs typographic quotes, they pass through unmodified instead of being converted to straight ASCII quotes. This causes rendering issues in the markdown parser and inconsistent quote display in chat bubbles.

The existing normalization line should be expanded to catch the full set of curly/smart quote characters.

---

## 9. reset messages doesn't properly reset them

**File:** `src/hooks/useChat.ts` (or `src/api/chats.ts` — `clearAndResetMessages`)

The `clearAndResetMessages` function in `chats.ts` handles the "reset messages" flow — it deletes message IDs and posts new first messages. Something in this flow doesn't work reliably. Possible causes:

- The client-side message store (`chatStore.messages`) isn't being cleared before the new messages arrive, so stale messages linger alongside the reset ones.
- The API call to delete messages and the call to post new ones happen sequentially without proper state synchronization on the client.
- The `clearAndResetMessages` function might send the `firstMessages` in reverse order but the server expects them in chronological order, or vice versa.

**Location:** Trace the reset flow from the UI trigger → `clearAndResetMessages` → state update to find where the state gets out of sync.

---

# doggo — feature requests

## FR1. confirm before discarding generation settings changes

**File:** `src/screens/chats/GenerationSettingsScreen.tsx`

When the user modifies any generation setting (temperature, context length, penalties, proxy, model, etc.) and presses the back button without saving, there's no prompt asking if they want to discard their changes. If the navigation has a `beforeRemove` event or the screen can detect dirty state, it should show an alert: "You have unsaved changes. Discard them?" with options to stay or leave.

**Scope:** Track a `isDirty` flag that flips true on any setting change, then intercept back navigation when dirty.

---

## FR2. buffer feedback when fetching personality/scenario in local mode with non-proxy characters

**File:** `src/screens/chats/ChatScreen.tsx` (or wherever `fetchSystemPrompt` / `attemptExtractSystemPrompt` is called)

When local mode is on and the character doesn't have a proxy configured, the app calls `attemptExtractSystemPrompt` which hits JanitorAI's generateAlpha endpoint to extract the personality/scenario. This can take several seconds with no visual feedback — the textareas stay empty and the user has no way to know if it's working or stuck.

The textareas should:
- Be disabled while fetching (non-editable, dimmed appearance)
- Show a streaming/buffer update as tokens arrive (similar to how bot messages stream character by character via `createTokenBuffer`)
- Only become enabled once the fetch completes or errors

Currently the textareas are live the whole time and the content just appears all at once when the response finishes, giving no indication of progress."

---

## FR3. comment actions bottom sheet (translate + report)

**File:** `src/components/reviews/CommentItem.tsx` (or wherever individual comments are rendered)

Long-pressing or tapping a "more" icon on a comment should open a bottom sheet with:

- **Translate comment** — sends the comment text through the user's configured proxy (same OpenAI-compatible endpoint used for chat) for translation into the user's locale. Should show a loading indicator while translating and replace the comment text (or show a "show original" toggle) once done.
- **Report comment** — opens a report flow similar to `CharacterReportModal.tsx`, letting the user submit a reason for the comment being reported. Needs a new API endpoint or reuses existing report infrastructure.

Currently comments only show text with no interaction options.

---

## FR4. share button in character page bottom sheet

**File:** `src/components/character/CharacterMenuSheet.tsx` (or wherever the character page's action sheet lives)

The character bottom sheet should have a "Share" option that shares the character's direct URL using the system share sheet (React Native's `Share.share()` or `expo-sharing`). The URL format should be something like `https://janitorai.com/characters/{characterId}_{characterName}`.

Currently there's no way to share a character link from within the app — users have to manually copy the URL from a browser."

---

## FR5. fix htmlToMarkdown function

**File:** `src/utils/markdown.ts`

The `htmlToMarkdown` function has several issues that cause broken rendering:

1. **`\n` breaks bold** — if the source HTML has a `<strong>` or `<b>` spanning multiple lines (e.g. `<strong>line 1\nline 2</strong>`), the newline ends up between the `**` delimiters, producing `**line 1` on one line and `line 2**` on the next instead of a contiguous bold span.

2. **Adjacent tags lose spacing** — when HTML has `</em><b>text</b>`, the output becomes `*old* **new**` without a space between the closing `*` and opening `**`, rendering as `*old***new**` which the markdown parser interprets as bold text with an extra `*`.

3. **No link support** — `<a href="...">text</a>` is stripped to just `text` instead of becoming `[text](url)`. Links should be converted to markdown link syntax.

4. **No image support** — `<img src="..." alt="...">` tags are completely stripped. Should convert to `![alt](src)` for inline display, ideally with integration into the existing image viewer (AvatarPreview or similar).

**Priority:** Fix items 1 and 2 first (they break existing content). Items 3 and 4 likely require a custom markdown renderer component rather than just fixing the regex pipeline in `htmlToMarkdown`."
