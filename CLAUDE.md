# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## What this is

A vanilla-JS PWA for studying Mandarin with _El Nuevo Libro de Chino Práctico_
(NPCR, 3rd ed. Spanish). No framework, no bundler, no package.json — plain
script tags loading globals. Deployed to GitHub Pages at
https://gabrielpila.github.io/mandarin-app/ directly from `main`.

## Commands

- **Run locally**: `python3 -m http.server 8471` from the repo root (also
  configured in `.claude/launch.json` as `mandarin-app` for the preview tool).
  The app loads as native ES modules, so it must be served over HTTP (not
  `file://`).
- **Validate content**: `node scripts/validate-data.mjs` — checks
  pinyin↔character alignment, that every hanzi in the texts resolves in the
  dictionary, and that `sw.js` ASSETS matches the files on disk. Run after
  editing any `data/*.js`.
- **Unit tests**: `node --test 'tests/*.test.mjs'` (segmenter, pinyin, SRS
  scheduling, number→hanzi). Plain Node, no deps.
- **Deploy**: push to `main`. GitHub Pages serves the repo root (no CI).
- No bundler, no package.json.
- **Code formatting:** When writing or modifying JS and CSS, wrap all code to
  80-character lines and respect standard formatting conventions from the start.
  Always run Biome (`npx @biomejs/biome format --write .`) afterwards to ensure
  compliance.
- **Markdown formatting:** Wrap all Markdown files to 80-character lines
  (excluding URLs and markdown tables). **Exception:** Files in the
  `extraction/` directory are raw data transcriptions and must NEVER be
  prose-wrapped or reformatted; preserve their original line-by-line structure.

## Critical invariants

- **Bump `CACHE` in `sw.js` on every release.** The service worker is
  cache-first over all assets (including the hanzi-writer CDN script). If you
  change JS/CSS/data without bumping the version, deployed clients keep the
  stale files. (Note: Local development on `localhost` automatically unregisters 
  the service worker to prevent stale caching).
- **SRS card ids are array positions** (`b1:<i>`, `b1s:<i>`, `b2:<i>`,
  `b2s:<i>`, assigned in `js/core.js` from the order of
  `B1_VOCAB`/`B1_SUP`/`B2_VOCAB`/`B2_SUP`). **Only append to these arrays —
  never reorder or delete entries**, or every user's review schedule silently
  attaches to the wrong words. If a duplicate vocabulary entry is discovered, 
  DO NOT delete it; instead, append `_deleted: true` to the redundant entry's 
  object so that the UI and validation scripts filter it out without shifting 
  the array indices.
- **Every hanzi token appearing in texts must exist in some vocab array.** The
  reader has no external dictionary: `js/core.js` builds `DICT` from the vocab
  arrays and segments text by greedy longest-match. An unknown character renders
  as a plain, untappable token. Missing tokens (e.g. a word used in a dialogue
  but absent from the book's index) get added to the `*-sup.js` file of the
  corresponding book.
- **Pinyin/character alignment**: `syllables()` in `core.js` splits an entry's
  `p` field on spaces, hyphens and apostrophes and maps syllables 1:1 onto
  characters (with an erhua special case: a trailing 儿 with one fewer syllable
  gets an empty ruby). When adding vocab, write pinyin with one space-separated
  syllable per character (`p:"tú shū guǎn"` for 图书馆), or ruby/tone rendering
  misaligns.
- **Every UI string must exist in both `es` and `en`** in the `UI` map at the
  top of `js/app.js`; `T(key)` resolves against `SRS.settings.lang`.

## Architecture

Native ES modules; `index.html` loads only the hanzi-writer CDN (classic global
`window.HanziWriter`) plus `<script type="module" src="js/main.js">`. Everything
else is `import`/`export`. Data files are `export const X = [...]`;
`data/index.js` re-exports all nine.

**Shared modules** (`js/`):

- `dict.js` — builds combined `ALL` + `DICT`, assigns card ids, greedy
  longest-match `segment()`, pinyin `syllables()`/`toneOf()`.
- `store.js` — the single source of persistence: SRS state (`mandarin.srs.v1`)
  and `settings` incl. streak `history` (`mandarin.settings.v1`), export/import.
  **All localStorage lives here.**
- `srs.js` — SM-2 scheduler (`review`, `dueCards`, `stats`, `leeches`,
  `forecast`); imports store.
- `audio.js` — `speak()` (per-character TTS voice/pitch map for the NPCR cast, 
  filtering out low-quality/robotic OS local voices) +
  `createReaderPlayer()` (line-by-line reader with highlight).
- `i18n.js` — `UI` map + `T`/`gloss`/`exGloss`.
- `ui.js` — `renderTokens`, `showPopup` (with concordance + HanziWriter),
  `startQuiz`, `applyTheme`, `setView`, `cardPool`.
- `numbers.js` — pure number/price/time/date → hanzi (unit-tested).
- `concordance.js` — lazy word→lines index over all texts.
- `router.js` — tab dispatch; views self-register via `register(tab, fn)`;
  `nav(tab)` calls the registered renderer.

**Views** (`js/views/`, one per screen, self-registering): `study` (stats,
dashboard, practice hub, cram grids), `cards` (`runCards` — SRS/cram/reverse +
session summary), `texts`, `vocab`, `grammar`, `settings`; `views/practice/` has
the games (`cloze`, `builder`, `pairs`, `tones`, `numbers`, plus shared
`corpus.js`). `main.js` wires the tab bar and boots.

Rendering of Chinese text always goes through `renderTokens(zh, mode)` in
`ui.js` — segments, attaches ruby (pinyin / tone marks / hidden) per character,
makes each known word tappable. Reuse it for any new feature that displays
Chinese.

Reverse flashcards use id `rev:<baseId>` stored in the same SRS state. Practice
games live under the "Práctica" hub on the Study tab (nav stays 5 tabs).

## Content pipeline

`extraction/*.md` holds raw transcriptions (vocab indexes and lesson dialogues)
hand-extracted from the scanned NPCR PDFs in the owner's Google Drive; the
`data/*.js` files were derived from them, adding English glosses and per-line
translations. When fixing content errors, check the raw file to see whether the
error came from transcription or from the JS conversion. Page-offset notes for
re-reading the PDFs live in the project memory, not in the repo.

## UI conventions

Spanish is the primary language (default `lang:'es'`); code comments and commit
history are mixed Spanish/English. Theming is CSS-variable based with three
mechanisms: `body.theme-light`/`body.theme-dark` classes plus a
`prefers-color-scheme` fallback, and `body.text-{small,medium,large}` for font
scaling — new styles must use the variables (`--primary`, `--ink`, `--card-bg`,
`--font-*`) rather than literals.
