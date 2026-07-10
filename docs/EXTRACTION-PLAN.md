# Extraction Plan: lesson sections (NPCR Books 1 & 2)

Goal: extract everything in each lesson that is not yet in `data/`, from the
scanned NPCR PDFs (locations and page offsets live in the project memory, not
in this repo — see the `npcr-pdf-extraction` memory note):

1. **Palabras Nuevas** blocks — to add *section* (after Texto 1 vs Texto 2 vs
   Palabras Suplementarias vs Additional Vocabulary non part part of those
   blocks) and *within-block order* to the existing vocab entries.
2. **Notas** (usage/culture notes attached to the texts).
3. **Gramática** sections (the real book content; `data/grammar.js` is a
   hand-written summary and stays untouched).
4. **Ejercicios** (I, II, III, …) — for future quizzes/practice.
5. **Ejercicios de Fonética** (pronunciation drills, mostly Book 1).
6. **Comprensión de Lectura** texts (NOT the same as `data/*-readings.js`,
   which are generated readings, not book content).

**Extract now, integrate later.** This plan covers getting the content into
`extraction/` + `data/` with validation. UI decisions (what to show where)
are explicitly deferred.

## Non-negotiable invariants (from CLAUDE.md)

- **Never reorder or delete entries in `B1_VOCAB`/`B1_SUP`/`B2_VOCAB`/
  `B2_SUP`.** Card ids are array positions. Section/order data is added as
  *new fields on existing entries in place*; genuinely new words are
  *appended* to the corresponding `*-sup.js`. Editing an entry's *fields* in
  place is allowed and expected — improving glosses, fixing pinyin/POS,
  adding `sec`/`ord` — as long as positions never shift (see CLAUDE.md).
- Raw transcriptions go to `extraction/` verbatim, never prose-wrapped.
- Every hanzi that will be rendered through `renderTokens` must resolve in
  `DICT`; `scripts/validate-data.mjs` enforces this for texts/readings and
  will be extended to the new files.
- New `data/*.js` files must be added to `data/index.js`, to `sw.js` ASSETS,
  and `CACHE` bumped before any release.

## Phase 1 — Tooling ✅ DONE (2026-07-10)

Built: `scripts/lib/lesson-raw.mjs` (raw parser), `scripts/lib/patch-vocab.mjs`
(in-place patcher), the two CLIs below, validator extensions, 10 empty data
files wired into `data/index.js` + `sw.js` (CACHE v0.8.5), and unit tests
(`tests/lesson-raw.test.mjs`, `tests/patch-vocab.test.mjs`). Verified
end-to-end against real Book 2 data. Notes discovered while building:

- Vocab entries also live-dedupe at runtime: `js/dict.js` marks exact
  cross-book duplicates (`h|p|pos`) `_deleted`. The merge script therefore
  **refuses to append** a block word that already exists in the other book
  (same hanzi + tone-stripped pinyin) and reports it for a manual decision.
- Appended sup entries get `en: ""` on purpose; `validate-data.mjs` fails
  until the English gloss is filled in — do it in the same session.

1. **Raw file format spec** (this file is the spec; see below). One raw file
   per book per lesson: `extraction/book1_lessons/L01.md` …
   `extraction/book2_lessons/L20.md`. Machine-parseable headers.
2. **`scripts/parse-lesson.mjs <file>`** — parses a raw lesson file, checks
   structural validity (headers, field counts, pinyin syllable counts vs
   hanzi), prints what it found. Run after writing each raw file.
3. **`scripts/merge-lesson-vocab.mjs <file>`** — takes the `## Palabras
   Nuevas` blocks of a raw lesson file and patches `data/book{1,2}-vocab.js`
   / `*-sup.js` **in place**, adding `sec` and `ord` fields (see schema).
   Matching: `(h, l)`, tie-broken by tone-stripped pinyin. It must report:
   - block words with no match in the arrays → candidate `*-sup.js` appends
     (script appends them with `sec`/`ord` set, after confirmation flag);
   - array entries of that lesson that matched no block (index-only words —
     fine, they keep `sec: undefined`);
   - ambiguous matches → manual resolution, never guess;
   - **field discrepancies** — where the lesson block's pinyin/POS/gloss
     disagrees with the entry (the index was the original source and is
     terser; the lesson block is usually more authoritative). Print a diff;
     the operator applies improvements in place. The script only writes
     `sec`/`ord` automatically — content improvements are reviewed edits.
4. **Extend `scripts/validate-data.mjs`**: validate new data files' schemas;
   dict coverage for notes/grammar/exercise/lectura hanzi; `sec`∈{1,2,3},
   `ord` unique within `(l, sec)`; existing checks unchanged.
5. Create empty-array data files + `data/index.js` re-exports so validation
   runs from day one.

## Phase 2 — Book 1 sweep (cheap-model sessions)

Per lesson (1–10; lesson start pages are in the `npcr-pdf-extraction`
memory):

1. Read the lesson's pages in 6–7 page batches (poppler is installed; the
   printed→PDF offset drifts — re-anchor on the lesson title page).
2. Transcribe into `extraction/book1_lessons/L<nn>.md` **immediately after
   each batch** (long sessions get summarized; the file is the checkpoint).
3. Run `parse-lesson.mjs` then `merge-lesson-vocab.mjs`; fix flagged issues
   while the pages are still fresh.
4. Commit per lesson (plain message, no AI attribution, do not push).

Do lesson 1 first end-to-end as a pilot; adjust format/schemas if the book's
real structure disagrees with this plan, and update this file.

## Phase 3 — Book 2 recon + sweep

Book 2's PDF is ~1606 pages for 10 lessons — the scan layout is unverified.
**First session: read the TOC / first 20 pages, map lesson start pages and
the printed→PDF offset, and record the map in the `npcr-pdf-extraction`
memory (not in the repo).** Then repeat the Phase 2 loop for lessons 11–20.

## Phase 4 — Conversion to `data/` (cheap model, per lesson or batched)

The raw files are Spanish (the book's language). Conversion adds `en`
glosses/translations and normalizes into the schemas below. Conversion for
notes/grammar/exercises/lecturas can lag extraction; vocab `sec`/`ord`
merging already happened in Phase 2/3 via script.

After each conversion batch: `node scripts/validate-data.mjs` and
`node --test 'tests/*.test.mjs'`.

## Raw lesson file format

```markdown
# Book 1 — Lección 3 (printed pp. 88-112, PDF 116-140)

## Palabras Nuevas 1
1. 谁 | shéi | Pron. | quién
2. 的 | de | Pt. | (partícula estructural)
...

## Palabras Nuevas 2
1. 进 | jìn | V | entrar
...

## Palabras Suplementarias   <!-- if the lesson has an in-lesson sup block -->
1. ...

## Vocabulario Adicional   <!-- lesson vocab outside the numbered blocks -->
1. ...

## Notas
### N1 你好吗
(verbatim Spanish note text, original line breaks)

## Gramática
### G1 Oraciones con predicado adjetival
(verbatim text; keep the book's example sentences on their own lines)

## Ejercicio de Fonética
(verbatim drills; pinyin rows as printed)

## Ejercicios
### Ejercicio I — [instruction line verbatim]
[items, one per line; mark audio-only exercises with `(audio)` after the
header — transcribe only the instruction for those]
### Ejercicio II — ...

## Comprensión de Lectura
### [title]
(verbatim text, one sentence/line as printed)
```

Rules: one vocab item per line, `n. hanzi | pinyin | POS | gloss` (POS may
be empty but keep the pipe); pinyin **one space-separated syllable per
character** (`tú shū guǎn`), even though the book prints syllables joined —
this is the repo-wide `p` convention and `parse-lesson.mjs` enforces the
alignment; never reflow the Chinese text; if a page is illegible, write
`[ILEGIBLE p.NNN]` and move on.

**Tone sandhi in transcription.** Chinese has tone-change rules (变调
biàndiào) that alter syllable tones in connected speech. The book sometimes
prints the *contextual* (sandhi) tone rather than the *citation* tone:

- **不 bù**: becomes bú before any 4th-tone syllable (e.g. 不太 bú tài).
  The data `p` field stores the citation form `bù`; the app renders it
  correctly from context.
- **一 yī**: becomes yí before 4th-tone, yì before 1st/2nd/3rd-tone.
  Again store the citation form `yī`.
- **3rd-tone sandhi**: two consecutive 3rd tones → first becomes 2nd
  (e.g. 你好 written nǐ hǎo but spoken ní hǎo). Store citation tones.
- **Idiom reductions**: some set phrases show non-standard tones in print
  (e.g. 马马虎虎 printed mā ma hū hū vs. citation mǎ ma hū hū). These are
  genuine ambiguities — transcribe the book's printed form and add an
  inline comment: `<!-- sandhi: citation mǎ ma hū hū -->`. The data
  `p` field should hold whichever form the team decides is canonical
  (prefer citation unless the book's form is the standard dictionary
  reading); note the decision in the commit message.

## Data schemas

**Vocabulario Adicional — selection policy.** The `## Vocabulario Adicional`
section (sec:4) is for words that appear *anywhere* in the lesson (dialogues,
exercises, readings, fun sections) but are not listed in any of the formal
numbered Palabras Nuevas / Suplementarias blocks. Criteria for inclusion:

1. **Appears in the lesson text** — visible in at least one sentence the
   learner will read.
2. **Useful to learn** — HSK 1-3, or common enough that a learner at this
   level would benefit.  Not proper names (celebrities, city names) unless
   pedagogically notable. The curator decides; not every incidental token
   qualifies.
3. **Not already in the formal blocks of this lesson** — if the word is in
   PN1/PN2/PS it goes there, not here.

These entries receive `extra: true` in the data (written automatically by
`merge-lesson-vocab.mjs` for all sec:4 blocks). The UI and SRS can use that
flag to let the learner optionally include or skip extra vocab. If the word
already exists in a vocab array at a different lesson, merge adds sec:4/ord to
it (and sets extra:true); if it is new it is appended to `*-sup.js`.

**Vocab patch (existing entries, fields added in place):**

```js
{ h:"谁", p:"shéi", ..., l:3,
  sec: 1,   // 1 = Palabras Nuevas after Texto 1, 2 = after Texto 2,
            // 3 = in-lesson Palabras Suplementarias block,
            // 4 = Vocabulario Adicional (outside the numbered blocks)
  ord: 4 }  // the book's printed number within that block
            // sec:4 entries also get extra: true (see above)
```

Index-only words simply lack `sec`/`ord`. UI can later sort a lesson by
`(sec, ord)` with index-only words at the end.

**`data/book{1,2}-notes.js`** — `export const B1_NOTES = [...]`:

```js
{ l:3, sec:1, n:1, zh:"你好吗",          // zh: the phrase the note is about
  es:"...", en:"..." }
```

**`data/book{1,2}-grammar-book.js`** — `B1_GRAMMAR_BOOK` (verbatim book
grammar; separate from the curated `GRAMMAR` in `grammar.js`):

```js
{ id:"b1-l3-g1", l:3, title:"...", es:"...", en:"...",
  examples:[{ zh:"...", es:"...", en:"..." }] }
```

**`data/book{1,2}-exercises.js`** — `B1_EXERCISES`:

```js
{ l:3, n:"II", kind:"sustitución" /* free-text from the book */,
  audio:false, ies:"instrucción", ien:"instruction",
  items:[{ zh:"...", es:"...", en:"...", ans:"..." }] }
```

`items` shape may vary by exercise kind; keep `zh`/`ans` conventions
consistent within a kind. Audio-only: `audio:true`, `items:[]`.

**`data/book{1,2}-phonetics.js`** — `B1_PHONETICS`/`B2_PHONETICS`:

```js
{ l:3, drills:[{ label:"tonos 3+3", p:["nǐ hǎo", ...] }] }
```

**`data/book{1,2}-lecturas.js`** — `B1_LECTURAS` (same line shape as
`*-readings.js` so `renderTokens`/reader player work unchanged):

```js
{ l:3, t:"...", tes:"...", ten:"...",
  lines:[{ zh:"...", es:"...", en:"..." }] }
```

Schemas are provisional until the Lesson 1 pilot; update this file if the
book's structure forces changes.

## Session protocol for extraction sessions

- Start from this file; page offsets/PDF paths are in project memory.
- Work one lesson at a time; raw file → parse script → merge script →
  commit. Never batch multiple lessons before validating.
- If the book shows something this plan didn't anticipate, extract it
  verbatim under a new `##` header and flag it in the commit message rather
  than dropping it.
