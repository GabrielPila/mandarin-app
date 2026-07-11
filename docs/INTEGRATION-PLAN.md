# Integration Plan: extracted lesson content → data + UI

Follow-up to `docs/EXTRACTION-PLAN.md` ("extract now, integrate later" —
this is the "later"). Extraction Phases 1–3 are complete: all 20 lessons
live in `extraction/book{1,2}_lessons/*.md`, `sec`/`ord` are merged into
the vocab arrays, and ten empty data files are wired into `data/index.js`
and `sw.js`. This plan covers Phase 4 (conversion into `data/`) and the
deferred Phase 5 (UI).

## Current state (verified 2026-07-10)

- `B1_NOTES`, `B2_NOTES`, `B1_GRAMMAR_BOOK`, `B2_GRAMMAR_BOOK`,
  `B1_EXERCISES`, `B2_EXERCISES`, `B1_PHONETICS`, `B2_PHONETICS`,
  `B1_LECTURAS`, `B2_LECTURAS` all export `[]`.
- Vocab `sec`/`ord` (and `extra:true` for sec:4) are already in
  `data/book{1,2}-vocab.js` / `*-sup.js` — no UI uses them yet.
- Raw-file completeness varies:

| Section                 | B1 L01–L09 | B1 L10 | B2 L11–L20 |
|-------------------------|------------|--------|------------|
| Palabras Nuevas / Sup   | ✅ full    | ✅     | ✅ full    |
| Vocabulario Adicional   | ✅         | ✅     | L11–L12 only |
| Notas                   | ✅ verbatim| ✅     | ⚠️ summarized |
| Gramática               | ✅ verbatim| ✅     | ⚠️ summarized, exercises named only |
| Ejercicio de Fonética   | ✅         | ✅     | ✅ (dialog drills) |
| Ejercicios              | ✅         | ❌     | ❌         |
| Comprensión de Lectura  | ✅         | ❌     | ❌         |

## Invariants that apply to every milestone

- Never reorder/delete vocab array entries; append new words to `*-sup.js`
  only, with proper `en` gloss in the same session.
- Every hanzi rendered through `renderTokens` must resolve in `DICT` —
  run `node scripts/validate-data.mjs` after each data change; lecturas
  and grammar examples will surface missing tokens to append to sup.
- New UI strings go in the `UI` map in `js/i18n.js` with both `es` and
  `en`; styles use CSS variables; nav stays 5 tabs.
- Bump `CACHE` in `sw.js` per release; run
  `node --test 'tests/*.test.mjs'` and Biome before each commit.
- Commit per milestone, plain message, no AI attribution, don't push.

## Milestone 1 — Lecturas in the Texts tab (best value/effort)

Data: convert `## Comprensión de Lectura` from B1 L01–L09 into
`B1_LECTURAS` using the planned schema
(`{ l, t, tes, ten, lines:[{zh,es,en}] }` — same line shape as
`*-readings.js`). Work needed per lesson: split the paragraph into
one-sentence lines, add `es`/`en` translations, pick a `t` (use the
first line or the raw `### Texto N` title). The book's comprehension
questions (`Responde las siguientes preguntas`) become a trailing
`preguntas:[{zh,es,en}]` field (extend the schema; UI may show them
collapsed under the text).

UI: `js/views/texts.js` already has a Diálogos/Lecturas toggle; the
current "Lecturas" tab lists the *generated* `*-READINGS`. Add a third
toggle "Del libro" (or merge: prefix generated ones with a badge) that
lists `B1_LECTURAS`/`B2_LECTURAS` and opens them with the existing
`renderReader(t, "reading")` — zero new reader code. Show the questions
below the reader with the standard translation toggle.

Validation: dict coverage will flag hanzi like 约翰 (proper names used
only in lecturas) — append to `*-sup.js` with `sec:4, extra:true`.

## Milestone 2 — Notas attached to the reader

Data: convert `## Notas` (B1 verbatim; B2 summaries as-is for now) into
`B1_NOTES`/`B2_NOTES` per the schema
`{ l, sec, n, zh, es, en }` (sec 1/2 from the `N1-x`/`N2-x` numbering).
Add `en` translations during conversion.

UI: in `renderReader` (texts view), when notes exist for `(t.l, part)`,
render a "Notas" accordion after each text part: the `zh` phrase through
`renderTokens` (tappable), then the es/en explanation per
`settings.lang`. Keep it collapsed by default so the reader stays clean.

## Milestone 3 — Book grammar in the Grammar tab

Data: convert `## Gramática` into `B1_GRAMMAR_BOOK`/`B2_GRAMMAR_BOOK`
(`{ id:"b1-l3-g1", l, title, es, en, examples:[{zh,es,en}] }`). B1 is
verbatim-ready; B2 entries are shorter — convert what exists and mark
thin ones for the re-extraction pass (Milestone 6).

UI: `js/views/grammar.js` gets a source toggle above the filter row:
**Resumen** (current curated `GRAMMAR`, unchanged) / **Libro** (new).
The Libro view filters by lesson (reuse the lesson dropdown pattern from
vocab view), renders title + explanation + examples; examples go through
`renderTokens` and get the existing 🔊 `speak()` affordance. Existing
`GRAMMAR` data and its HSK filters stay untouched.

## Milestone 4 — Book-order vocabulary (data is already there)

Pure UI milestone; unblocked today.

- `js/views/vocab.js`: when a specific lesson is selected, sort by
  `(sec, ord)` with index-only entries last (per CLAUDE.md), and insert
  section headers: "Palabras Nuevas 1/2", "Palabras Suplementarias",
  "Vocabulario Adicional", "Solo índice".
- Surface `extra:true` visually (a lighter tag next to CORE/SUP).
- Settings + SRS: add a setting `includeExtraVocab` (default on, to not
  change current behavior) that filters `extra:true` cards out of
  `cardPool` in `js/ui.js` when off. New setting string in `UI` map.

## Milestone 5 — Fonética + Ejercicios in the Práctica hub

Data: convert `## Ejercicio de Fonética` into `B{1,2}_PHONETICS`
(`{ l, drills:[{ label, p:[...] }] }`; B2's dialog-style drills fit as
one drill with the dialog lines as items — adjust schema if needed and
update EXTRACTION-PLAN.md). Convert B1 L01–L09 `## Ejercicios` into
`B1_EXERCISES` per schema; exercises whose items are fill-in/transform
(`___`, `→`) map naturally to `{ zh, ans }`.

UI (two small games under the Práctica hub in the Study tab, following
`js/views/practice/*` self-contained pattern):

- **Fonética**: show the toneless pinyin drill, user picks tones or just
  reveals + plays TTS. Start minimal: reveal + audio; the tones game
  (`tones.js`) already covers active tone practice.
- **Ejercicios del libro**: lesson picker → exercise list → items shown
  with `renderTokens`, answer revealed on tap (self-graded). No SRS
  integration; this is deliberate practice, not scheduling.

This milestone is the largest and most uncertain; do one exercise
`kind` end-to-end first (sustitución) before converting the rest.

## Milestone 6 — Re-extraction pass (gaps found above)

Back to the PDFs (offsets in `docs/EXTRACTION-PROGRESS.md` + memory):

1. B1 L10 + B2 L11–L20: `Ejercicios` and `Comprensión de Lectura`
   sections were not transcribed — extract them into the existing raw
   files under the standard headers.
2. B2 L13–L20: `Vocabulario Adicional` sweep was skipped — do it and run
   `merge-lesson-vocab.mjs` for the sec:4 blocks.
3. B2 Notas/Gramática: upgrade summaries to verbatim where the summary
   lost content (spot-check against the PDF; not every note needs it).
4. Verify B2 L12–L15/L17 Chinese titles (noted pending in
   EXTRACTION-PROGRESS.md).

Then run Milestones 1/2/3/5 conversion for the newly extracted material.

## Suggested order & session sizing

M1 → M2 → M4 → M3 → M5 → M6, one milestone per session (M1/M2 could
share one). M4 can be pulled forward any time — it needs no conversion.
Each conversion milestone: convert one lesson first, run validator +
tests, eyeball in the app (`python3 -m http.server 8471`), then batch
the rest. Bump `sw.js` CACHE once per shipped milestone, not per lesson.

## Explicit non-goals (for now)

- No SRS scheduling for exercises/notes/grammar (only vocab cards).
- No new nav tab — everything hangs off Textos, Gramática, Vocab, and
  the Práctica hub.
- `data/grammar.js` (curated summary) and `*-readings.js` (generated
  readings) stay untouched.
