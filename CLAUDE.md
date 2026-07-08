# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A vanilla-JS PWA for studying Mandarin with *El Nuevo Libro de Chino Práctico* (NPCR, 3rd ed. Spanish). No framework, no bundler, no package.json — plain script tags loading globals. Deployed to GitHub Pages at https://gabrielpila.github.io/mandarin-app/ directly from `main`.

## Commands

- **Run locally**: `python3 -m http.server 8471` from the repo root (also configured in `.claude/launch.json` as `mandarin-app` for the preview tool).
- **Validate a data file after editing**: `node -e "global.window={}; require('./data/book1-vocab.js'); console.log(global.window.B1_VOCAB.length)"` — all data files are `window.X = [...]` assignments, so this catches syntax errors.
- **Deploy**: push to `main`. GitHub Pages serves the repo root (legacy build, no CI).
- There are no tests and no linter.

## Critical invariants

- **Bump `CACHE` in `sw.js` on every release.** The service worker is cache-first over all assets (including the hanzi-writer CDN script). If you change JS/CSS/data without bumping the version, deployed clients keep the stale files. Same applies during local dev: unregister the SW or bump the version to see changes.
- **SRS card ids are array positions** (`b1:<i>`, `b1s:<i>`, `b2:<i>`, `b2s:<i>`, assigned in `js/core.js` from the order of `B1_VOCAB`/`B1_SUP`/`B2_VOCAB`/`B2_SUP`). **Only append to these arrays — never reorder or delete entries**, or every user's review schedule silently attaches to the wrong words.
- **Every hanzi token appearing in texts must exist in some vocab array.** The reader has no external dictionary: `js/core.js` builds `DICT` from the vocab arrays and segments text by greedy longest-match. An unknown character renders as a plain, untappable token. Missing tokens (e.g. a word used in a dialogue but absent from the book's index) get added to the `*-sup.js` file of the corresponding book.
- **Pinyin/character alignment**: `syllables()` in `core.js` splits an entry's `p` field on spaces, hyphens and apostrophes and maps syllables 1:1 onto characters (with an erhua special case: a trailing 儿 with one fewer syllable gets an empty ruby). When adding vocab, write pinyin with one space-separated syllable per character (`p:"tú shū guǎn"` for 图书馆), or ruby/tone rendering misaligns.
- **Every UI string must exist in both `es` and `en`** in the `UI` map at the top of `js/app.js`; `T(key)` resolves against `SRS.settings.lang`.

## Architecture

Load order in `index.html` matters — plain globals, later scripts consume earlier ones:

1. **Data layer** (`data/*.js`): `B1_VOCAB`, `B1_SUP`, `B2_VOCAB`, `B2_SUP` (vocab entries: `{h, p, pos, es, en, l, sup?, tags?, ex?:[zh,es,en]}` where `l` is lesson 0–20, 0 = phonetics prep, 1–10 Book 1, 11–20 Book 2, `tags` carries HSK levels); `B1_TEXTS`/`B2_TEXTS` (book dialogues: lessons → `parts` → `lines` of `{s: speaker, zh, es, en}`); `B1_READINGS`/`B2_READINGS` (generated graded readings, same line shape without parts); `GRAMMAR` (grammar points with tags + example lines).
2. **`js/core.js`** — builds the combined `ALL` list + `DICT` map, greedy longest-match `segment()`, pinyin syllable alignment and tone extraction (`toneOf` reads the diacritic), and `speak()` (Web Speech TTS with per-character pitch/voice heuristics for the NPCR cast — male/female speaker mapping lives here).
3. **`js/srs.js`** — SM-2-style scheduler + all persistence: review state (`mandarin.srs.v1`) and settings/streak history (`mandarin.settings.v1`) in localStorage, export/import as JSON.
4. **`js/app.js`** — all UI. One function per tab (`renderStudy`, `renderTextList`/`renderReader`, `renderVocab`, `renderGrammar`, `renderSettings`), wired through `nav()`; views are rebuilt by setting `#view.innerHTML`. Also: flashcard runner (`runCards` handles both SRS and cram modes), word popup (`showPopup`, with HanziWriter stroke animations), tracing quiz (`startQuiz`), and the audio reader (line-by-line TTS with highlight, `playReader`/`stopReader`).

Rendering of Chinese text always goes through `renderTokens(zh, mode)` — it segments, attaches ruby (pinyin / tone marks / hidden) per character, and makes each known word tappable. Reuse it for any new feature that displays Chinese.

## Content pipeline

`extraction/*.md` holds raw transcriptions (vocab indexes and lesson dialogues) hand-extracted from the scanned NPCR PDFs in the owner's Google Drive; the `data/*.js` files were derived from them, adding English glosses and per-line translations. When fixing content errors, check the raw file to see whether the error came from transcription or from the JS conversion. Page-offset notes for re-reading the PDFs live in the project memory, not in the repo.

## UI conventions

Spanish is the primary language (default `lang:'es'`); code comments and commit history are mixed Spanish/English. Theming is CSS-variable based with three mechanisms: `body.theme-light`/`body.theme-dark` classes plus a `prefers-color-scheme` fallback, and `body.text-{small,medium,large}` for font scaling — new styles must use the variables (`--primary`, `--ink`, `--card-bg`, `--font-*`) rather than literals.
