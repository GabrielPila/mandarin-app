# Extraction Progress Log

Tracks Phase 2 (Book 1) and Phase 3 (Book 2) work.
See `docs/EXTRACTION-PLAN.md` for the full plan.

## Which lessons belong to which book

| Book | Lecciones | Archivo de datos              |
|------|-----------|-------------------------------|
| 1    | 1–10      | data/book1-vocab.js + book1-sup.js |
| 2    | 11–20     | data/book2-vocab.js + book2-sup.js |

---

## Book 1

PDF path:
`/Users/gabrielpila/Library/CloudStorage/GoogleDrive-gabrielpila.eng@gmail.com/My Drive/01_US Life/05_Languages/Mandarin/NuevoLibroChinoPractico/Nuevo-Libro-de-Chino-Practico-1-Libro-de-Texto-1.pdf`

Printed→PDF offset: +28 (Lección 1 printed p.43 = PDF p.71)

## Book 1 lesson page map

| Lesson | Printed start | PDF start | Status         |
|--------|---------------|-----------|----------------|
| L01    | 43            | 71        | ✅ Done        |
| L02    | 63            | 91        | ✅ Done        |
| L03    | 88            | 116       | ✅ Done        |
| L04    | 113           | 141       | ✅ Done        |
| L05    | 138           | 166       | ✅ Done        |
| L06    | 162           | 190       | ✅ Done        |
| L07    | 184           | 212       | ✅ Done        |
| L08    | 208           | 236       | ✅ Done        |
| L09    | 234           | 262       | ✅ Done        |
| L10    | 258           | 286       | ✅ Done        |

## Book 2

PDF path: `/Users/gabrielpila/ClaudeProjects/MandarinApp/books/Chino-Practico-2.pdf`
(>100 MB — use `pdftoppm` to render pages, not the Read PDF tool)

Printed→PDF offset: +24 (L11 printed p.1 = PDF p.25)

## Book 2 lesson page map

| Lesson | Título chino          | Título español                                              | Printed | PDF |
|--------|-----------------------|-------------------------------------------------------------|---------|-----|
| L11    | 我玩儿得非常高兴       | Me divertí mucho                                            | 1       | 25  |
| L12    | (ver título en PDF)   | Adónde quieres hacer el envío                               | 29      | 53  |
| L13    | (ver título en PDF)   | Por favor, escribe aquí tu nombre y número de móvil         | 57      | 81  |
| L14    | (ver título en PDF)   | Alquilar es mucho más barato que comprar                    | 83      | 107 |
| L15    | (ver título en PDF)   | Las pinturas chinas y las pinturas al óleo son diferentes   | 111     | 135 |
| L16    | 我是五岁开始学游泳的   | Tenía cinco años cuando aprendí a nadar por primera vez     | 140     | 164 |
| L17    | (ver título en PDF)   | ¿Ha visto alguna vez la Ópera de Pekín?                     | 165     | 189 |
| L18    | 我们爬上长城了         | Hemos escalado la Gran Muralla China                        | 190     | 214 |
| L19    | 汽车被我撞了           | El coche fue atropellado por mí                             | 216     | 240 |
| L20    | 请把电脑拿出来         | Por favor, saca tu computadora                              | 243     | 267 |

Apéndices: p.275 (funciones), p.276 (índice vocab), p.299 (índice caracteres).

| Lesson | Status         |
|--------|----------------|
| L11    | ✅ Done        |
| L12    | ✅ Done        |
| L13    | ✅ Done        |
| L14    | ✅ Done        |
| L15    | ✅ Done        |
| L16    | ✅ Done        |
| L17    | ✅ Done        |
| L18    | ✅ Done        |
| L19    | ✅ Done        |
| L20    | ✅ Done        |

## Session log

### 2026-07-10 — Session 1
- Created `extraction/book1_lessons/` directory.
- Completed L01–L05 (printed pp.43–161, PDF pp.71–189).
- Tooling improvements: sub-entry notation (5a/5b), G{n}-{roman} exercise format,
  sec:4 Vocabulario Adicional with extra:true, cross-lesson skip in merge script,
  sandhi comment convention, hanzi-order warning in parser.
- Pending manual: 马马虎虎 pinyin mā vs mǎ decision.

### 2026-07-10 — Session 2
- Completed L06–L10 (printed pp.162–285, PDF pp.190–313).
- Book 1 Phase 2 extraction 100% complete: all 10 lessons have
  sec/ord in B1_VOCAB and B1_SUP.
- validate-data.mjs passes (1413 entries).

### 2026-07-10 — Session 3
- Confirmed Book 2 PDF offset: printed + 24 = PDF page.
- Completed L11–L20 (Book 2 Phase 3): all 10 lessons extracted.
- sec/ord written to B2_VOCAB and B2_SUP for all 20 lessons.
- Lesson-to-book mapping added to this file.
- All 33 tests pass, validate-data.mjs passes (1414 entries).
- Chinese titles confirmed on title pages for L11, L16, L18, L19, L20;
  L12–L15 and L17 Chinese titles to verify on next visit.
