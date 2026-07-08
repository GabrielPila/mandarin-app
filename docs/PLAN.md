# Implementation Plan — Modularization + 9 Features

> Living document. Any agent taking over: read CLAUDE.md first, then the STATUS section below.
> Rules: commit at milestones with plain messages (NO AI attribution), **never push without Gabriel's approval**.

## STATUS (update as you go)

- [ ] 1. `docs: add implementation plan` — this file
- [ ] 2. `chore: data files to ES modules + validation script + tests` (Phase 0 + 1.1)
- [ ] 3. `refactor: split app into ES modules` (Phase 1, CACHE v0.8.0)
- [ ] 4. `feat: progress dashboard and session stats` (2.8 lapses+summary, 2.9)
- [ ] 5. `feat: reverse cards and cloze quiz` (2.1, 2.2)
- [ ] 6. `feat: practice games — sentence builder, pairs, tones, dictation` (2.3–2.6)
- [ ] 7. `feat: word concordance` (2.7) + final CACHE bump

Handoff notes: (none yet)

## Context

Personal PWA for studying Mandarin with *El Nuevo Libro de Chino Práctico* (NPCR 1 & 2, Spanish ed.). Current state (v0.7.0): vanilla JS, no build step, script-tag globals. Features: SM-2 flashcards + per-lesson/HSK cram, dialogues & graded readings with tap-word popups + ruby (pinyin/tones) + per-line ES/EN translations + TTS audio reader with per-character voices, vocab browser, grammar reference, HanziWriter stroke animations + tracing quiz, streak/heatmap, themes/text sizes, localStorage progress with export/import.

Problems: all UI logic in one ~760-line `js/app.js`; cross-module communication via `window.*` globals and inline `onclick="..."` attributes; data files attach to `window`; `sw.js` asset list/version maintained by hand with no checks; zero tests; no data validation (content was hand-transcribed from scanned PDFs).

Goals: **(A)** refactor to native ES modules (NO bundler — must keep "edit → push → GitHub Pages serves it" workflow), **(B)** add data validation + unit tests runnable with plain Node, **(C)** implement 9 chosen features (§Phase 2).

## Invariants — breaking these corrupts user data or content

1. **SRS ids are array positions.** `js/core.js` assigns `id = 'b1:'+index` over `B1_VOCAB` (and `b1s:`/`b2:`/`b2s:` over `B1_SUP`/`B2_VOCAB`/`B2_SUP`). Never reorder/delete/insert-mid-array in `data/*-vocab.js` / `*-sup.js`; append only.
2. **localStorage keys must not change**: `mandarin.srs.v1` (review state: `{[cardId]: {ef,ivl,reps,due,last}}`) and `mandarin.settings.v1` (settings incl. `history` day-counts used by streak/heatmap). The refactor must load existing data unchanged. Schema additions (e.g. `lapses`) must be optional with safe defaults.
3. **Pinyin alignment**: entry `p` holds one syllable per hanzi separated by spaces (also split on `-` and `'`); trailing 儿 with one fewer syllable renders an empty ruby (erhua). See `syllables()` in `js/core.js`.
4. **Dictionary coverage**: the reader segments text greedily (longest match, max word length from dict) against entries only from the four vocab arrays. Any hanzi not covered renders as an untappable plain token. New text content must have all its words present; missing tokens are appended to the corresponding `*-sup.js`.
5. **Service worker**: `sw.js` is cache-first over an explicit `ASSETS` list incl. the hanzi-writer CDN URL. Every deploy that changes any asset must bump `const CACHE = 'mandarin-vX.Y.Z'` and keep `ASSETS` complete, or clients serve stale files forever.
6. **Commits**: plain messages, no AI attribution, no Co-Authored-By trailers.
7. **i18n**: every user-visible string exists in both `es` and `en` in the `UI` map (currently top of `js/app.js`); `T(key)` resolves via `settings.lang`. Spanish is the default/primary language.

## Current file map (before refactor)

- `index.html` — 12 classic script tags: hanzi-writer CDN, 9 data files, `js/core.js`, `js/srs.js`, `js/app.js`
- `js/core.js` (143 ln) — builds `ALL` + `DICT`, `segment()`, `syllables()`, `toneOf()`, `TONE_MARK`, `isHan()`, `speak(text,onEnd,speaker)` with `MALE_NAMES` + per-character pitch table (马大为 0.35, 丁力波 0.55, 宋华 0.45, 王小云 1.3, 林娜 1.1, 陈老师 0.85) and premium-voice fallbacks. Exposes `window.Core`.
- `js/srs.js` (79 ln) — SM-2 lite `review(id, grade∈{0,3,4,5})`, `dueCards`, `newCards`, `stats`, settings object `{lang, includeSup, newPerDay, maxLesson, textSize, theme, history, voiceSpeed, voiceURI}`, `recordActivity()` (bumps `history[today]`), `exportData/importData/resetAll`. Exposes `window.SRS`.
- `js/app.js` (757 ln) — `UI` i18n map; `renderTokens(zh, mode∈none|pinyin|tones)`; `showPopup(tok)` (+ HanziWriter mini stroke boxes); `window.startQuiz(word)` tracing quiz modal (`#quiz-modal`); tab router `nav()`; `renderStudy` (stats+streak+heatmap+cram grids incl. HSK-tag decks); `startSRS/startCram/runCards(queue, srsMode)`; texts list + `renderReader/drawReader` + audio-reader engine (`window.playReader/stopReader/playNextLine`, `readerLines`, highlights `.reading-active`, `Core.speak` per line with speaker); `renderVocab` (search + all/hsk/lesson filter); `renderGrammar` (tag filter, tappable audio examples); `renderSettings` (lang, text size, theme, maxLesson≤20, newPerDay, includeSup, voiceSpeed, voice picker w/ `onvoiceschanged`, test voice, export/import/reset); `applyTheme()`; init + SW registration. Inline `onclick=` handlers exist on: popup speak button, card speak/✍️ buttons (`Core.speak(...)`, `window.startQuiz(...)`).
- `data/` — `book{1,2}-vocab.js` (`B1_VOCAB` 470 entries / `B2_VOCAB` 508), `book{1,2}-sup.js` (151+~15 / 198), `book{1,2}-texts.js` (`parts[].lines[] {s,zh,es,en}`; 266 + 373 lines), `book{1,2}-readings.js` (`lines[] {zh,es,en}`), `grammar.js` (`GRAMMAR[] {id,tags,title,desc,examples[]{zh,es,en,s}}`). Vocab entry shape: `{h,p,pos,es,en,l:0..20,sup?,tags?:['hsk1'...],ex?:[zh,es,en]}`. HSK tags exist on core vocab only.
- `css/app.css` — CSS-variable theming (`body.theme-light/.theme-dark` + `prefers-color-scheme` fallback; `body.text-{small,medium,large}`; use `--primary --ink --card-bg --font-*`).
- `extraction/*.md` — raw transcriptions from the PDFs (content source of truth for fixing data errors).
- Local dev: `python3 -m http.server 8471` (`.claude/launch.json` name `mandarin-app`). No package.json (fine — Node scripts run without one; add none unless needed).

---

## Phase 0 — Safety net (do this before touching app code)

**0.1 `scripts/validate-data.mjs`** — pure Node ESM, zero deps, exits non-zero with a readable report. Because data files are still `window.X =` at this point, load them by reading the file text and evaluating with a stubbed `window` (`new Function('window', src)`), OR do Phase 1.1 (data→ESM conversion) first and import directly — preferred order: convert data files first (§1.1), then this script uses plain `import`. Checks:
  - vocab: `syllables(entry).length === [...entry.h].filter(isHan-ish)` alignment incl. erhua rule; `ex` is `[string,string,string]` when present; `l ∈ 0..20`; `tags ⊆ {hsk1..hsk6} ∪ npcr*`; warn on duplicate `h|p|pos`; `es`/`en` non-empty.
  - texts/readings/grammar: schema shape; **segment every `zh` (and speaker `s`) with the real segmenter and list all han characters that fall through as plain tokens** (= missing dictionary entries).
  - sw.js: regex-parse `ASSETS`; error if any listed local file is missing on disk or any `js/`, `css/`, `data/` file on disk is missing from the list.
- **0.2 `tests/*.test.mjs`** run by `node --test tests/`:
  - `dict.test.mjs`: segment (longest match, punctuation passthrough, digits), syllables (multi-syllable, erhua 面条儿/一会儿, apostrophe 西安, hyphen 第一次), toneOf all 5 tones.
  - `srs.test.mjs`: grade-0 resets reps & schedules +10min; first good = 1d; second good ∈ {3,4}d; EF floor 1.3; `lapses` increments only on fail-after-success (added in Phase 2.8 — write test then).
  - `numbers.test.mjs`: written with feature 6.
- **0.3** Document commands in CLAUDE.md (`node scripts/validate-data.mjs`, `node --test tests/`).
- **Fix everything the validator finds** (expected: a handful of missing text tokens → append to `*-sup.js`).

## Phase 1 — ES-module refactor (zero behavior change)

**1.1 Data → ESM**: in each of the 9 data files change the header line `window.X = [` → `export const X = [` (nothing else). Add `data/index.js`:
```js
export {B1_VOCAB} from './book1-vocab.js'; … export {GRAMMAR} from './grammar.js';
```
**1.2 Module split** (move code verbatim where possible; keep names):
- `js/dict.js` — from core.js: build `ALL` (id assignment untouched), `DICT`, `MAXLEN`, export `{ALL, DICT, segment, syllables, toneOf, TONE_MARK, isHan}`. Imports from `../data/index.js`.
- `js/audio.js` — `speak()` + `MALE_NAMES`/pitch table + voice filtering/picker helpers + the reader playback engine (`createReaderPlayer()` returning `{play(start), stop(), isPlaying()}` operating on `{row,text,speaker}[]`, replacing `window.playReader/stopReader/playNextLine`).
- `js/store.js` — settings object (same defaults & key `mandarin.settings.v1`), `saveSettings`, `recordActivity`, `exportData/importData/resetAll`; also owns SRS state persistence (`mandarin.srs.v1`) exposing `getState/putCard/getCard` for srs.js.
- `js/srs.js` — scheduling only: `review`, `dueCards`, `newCards`, `stats` (+`lapses` later). Imports store.
- `js/i18n.js` — `UI` map + `T(key)` + `gloss(entry)` + `exGloss(ex)`.
- `js/ui.js` — `$`, `setView`, `renderTokens`, `showPopup` (incl. HanziWriter boxes; HanziWriter stays a classic-script CDN global — reference as `window.HanziWriter`), tracing-quiz modal (`startQuiz`), `applyTheme`.
- `js/views/study.js` (`renderStudy` + heatmap/streak + cram grids + Práctica hub §2), `js/views/cards.js` (`startSRS/startCram/runCards` + session summary later), `js/views/texts.js` (list + reader + drawReader wired to audio player), `js/views/vocab.js`, `js/views/grammar.js`, `js/views/settings.js`, `js/views/practice/…` (games, Phase 2).
- `js/main.js` — imports views, tab wiring (`nav`, `renderTabs`), theme init, `matchMedia` listener, SW registration.
- Circular-dependency rule: views import ui/i18n/store/srs/dict/audio; ui imports i18n/dict/audio; nothing imports views except main. Cross-view navigation (e.g. card session → back to study) via callback parameters, not imports.
**1.3 index.html** — keep hanzi-writer classic tag; replace all other tags with `<script type="module" src="js/main.js"></script>`.
**1.4** Remove every inline `onclick=` (popup speak, card speak/✍️) → `addEventListener` at render time; delete all `window.*` assignments except none (quiz modal handled inside ui.js).
**1.5** `sw.js`: ASSETS ← new file list (data/index.js, all js modules); bump CACHE to `mandarin-v0.8.0`.
**1.6 Checkpoint** (must pass before Phase 2): validator + tests green; preview: all 5 tabs work, a card graded before the refactor is still scheduled (localStorage intact), reader pinyin/tones/translation/audio, popup + stroke animation, tracing quiz, settings all functional; console clean.

## Phase 2 — Features

UI home: **"Práctica" section on the Study tab** below the cram grids — a grid of game cards (icon + name). Nav stays 5 tabs. All games: filter material by `settings.maxLesson`, call `recordActivity()` per answered item, and, where a specific word is quizzed, also `SRS.review(id, correct?4:0)`. All new strings go in `i18n.js` in both languages.

**2.1 Reverse cards** (`js/views/cards.js` + store)
- Virtual cards with id `rev:<baseId>`, same state store. Settings toggle `reverseCards` (default off).
- Deck build in `startSRS`: when on, due/new pools include reverse ids (new-card budget `newPerDay` shared 50/50, rounding up for forward).
- `runCards` when id starts `rev:`: front = gloss + POS (+ example translation as hint), back = hanzi (big) + pinyin + stroke animation; 🔊 on back only. Grading identical.
- Acceptance: toggling off hides reverse cards from queue but preserves their state.

**2.2 Cloze quiz** (`js/views/practice/cloze.js`)
- Corpus: all dialogue+reading lines with lesson ≤ maxLesson. Pick a line; segment; candidate blanks = tokens whose entry has `pos` not in `{NP, Pt.*, Interj., Conj.}` and length ≥ 1 word in DICT; skip lines w/o candidates.
- Render line via `renderTokens` with the target word replaced by `＿＿`; 4 options = target + 3 distractors sampled same lesson first, then same `pos`, then anywhere (dedupe by `h`). Show ES/EN line translation as context under the sentence. After answer: highlight correct, play line audio, next. 10 per round; round summary (n correct).
- Feed `SRS.review(target.id, correct?4:0)`.

**2.3 Sentence builder** (`js/views/practice/builder.js`)
- Same corpus; keep lines with 4–12 word-tokens after dropping punctuation-only tokens (punctuation re-attached on render). Scramble tokens (reshuffle if identity order). Tap tiles → answer row (tap again to return). "Comprobar": compare joined `h` sequence with original; on success show full ruby line + translation + auto audio. 8 per round.

**2.4 Matching pairs** (`js/views/practice/pairs.js`)
- Lesson picker (reuse lesson-grid pattern) → rounds of 6 pairs from that lesson's non-sup vocab; two shuffled columns (hanzi | gloss or pinyin — mode toggle). Tap-tap matching; wrong flash red; matched fade. Timer + best-time per lesson persisted in settings (`pairsBest`). Round end → next 6 until pool exhausted.

**2.5 Tone trainer** (`js/views/practice/tones.js`)
- Mode A (identify): random 1–2 syllable non-sup entry with all tones ≠ neutral; `speak(h)`; buttons = tone-pattern candidates (real pattern + 3 permutations, using `TONE_MARK` glyphs); reveal word+pinyin after answer.
- Mode B (minimal pairs): pick syllable from entry pinyin; build 4 variants tone 1–4 by swapping diacritic (util `applyTone(syl, tone)` in dict.js — handles vowel-priority rule a>e>o>i/u last-vowel; unit-test it); TTS pronounces the real word; user picks which tone they heard.
- Score per session only; 10 items.

**2.6 Number & price dictation** (`js/views/practice/numbers.js` + `js/numbers.js`)
- `numToHanzi(n)` for 0–99 999 (incl. 两 usage for hundreds+ when leading, 零 rules, 十 vs 一十); `priceToHanzi(kuai, mao)` → `X块Y毛(钱)`; `timeToHanzi(h,m)` → `X点(半|Y分|一刻|三刻)`; `dateToHanzi(m,d)` → `X月Y号`. Unit-test in `tests/numbers.test.mjs` (incl. 105→一百零五, 250→两百五十, 12:15→十二点一刻).
- Game: category picker (números/precios/horas/fechas/mixto); TTS speaks the hanzi string; user types digits (custom formats per category: `##:##`, `##/##`, `¥##.#`); enter to check; reveal hanzi+pinyin. 10 per round.

**2.7 Word concordance** (`js/concordance.js` + ui.js + vocab view)
- Build lazily on first use (then cache): iterate all texts/readings (+grammar examples), segment each line once, produce `Map<hanzi, {line, source:{type,lesson,title}}[]>`.
- Popup: after the gloss/example block, "Usos en los textos (N)" section listing up to 5 lines (word highlighted, translation underneath, 🔊 per line); "ver más" expands.
- Vocab tab: search gains a second results block "En los textos" when query is hanzi: lines containing the query string.

**2.8 Smart drills & session stats** (`js/srs.js`, `js/views/cards.js`, study view)
- `review()`: `if(grade===0 && c.reps>0) c.lapses=(c.lapses||0)+1`.
- Leeches = `lapses ≥ 4`; "Palabras difíciles" card in Práctica opens a cram deck of leeches + bottom-20 by EF (dedup).
- Session summary replacing the current "done" screen: total, % correct (first attempt), per-grade counts, elapsed time, failed-word list (tappable popups) + "Repasar falladas" button (cram of failed set).

**2.9 Progress dashboard** (`js/views/study.js`)
- Collapsible "Progreso" section: total known (state exists) / mature (`ivl ≥ 21`); per-lesson bars 0–20 (learned vs total, mature shading); per-HSK bars via tags; 7-day due forecast mini bar chart from `due` timestamps.
- Pure CSS bars using theme vars; no libraries.

## Commit sequence (plain messages, no AI attribution)

1. `docs: add implementation plan` (this file → `docs/PLAN.md`)
2. `chore: data files to ES modules + validation script + tests` (Phase 0 + 1.1; fix findings)
3. `refactor: split app into ES modules` (1.2–1.6, CACHE v0.8.0)
4. `feat: progress dashboard and session stats` (2.8 partial: lapses+summary, 2.9)
5. `feat: reverse cards and cloze quiz` (2.1, 2.2)
6. `feat: practice games — sentence builder, pairs, tones, dictation` (2.3–2.6)
7. `feat: word concordance` (2.7) — final CACHE bump (v0.9.0) + deploy verification

## Verification (after every commit, minimum after 3, 6, 7)

1. `node scripts/validate-data.mjs && node --test tests/` — green.
2. Preview (`mandarin-app` server, mobile viewport): console error-free; smoke: Study (stats/streak/cram/practice hub), review 3+ cards incl. reload-persistence, Textos (toggles, tap-popup, audio play/stop, line-tap seek), Vocabulario (search+filters), Gramática, Ajustes (each control), every new game one full round.
3. localStorage migration check: seed pre-refactor state → post-refactor stats identical.
4. Deploy: bump CACHE, push main, `curl -s -o /dev/null -w "%{http_code}"` on representative assets, reload twice on device (SW update cycle) and confirm version banner/behavior.
