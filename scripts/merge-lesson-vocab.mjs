// merge-lesson-vocab.mjs — cruza los bloques de Palabras Nuevas de un
// archivo crudo con data/book*-{vocab,sup}.js y escribe sec/ord in place.
//
// Uso:
//   node scripts/merge-lesson-vocab.mjs extraction/book1_lessons/L03.md
//       (dry-run: solo informe)
//   … --write        aplica sec/ord a las entradas emparejadas
//   … --append-sup   además añade al *-sup.js las palabras sin entrada
//                    (con en:"" — rellenar el gloss inglés antes de validar)
//
// SOLO escribe sec/ord y appends; nunca reordena, borra ni toca otros
// campos. Las discrepancias de pinyin/POS/gloss se informan para edición
// manual revisada (ver docs/EXTRACTION-PLAN.md).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseRawLesson } from "./lib/lesson-raw.mjs";
import {
	appendEntry,
	formatVocabEntry,
	upsertFields,
} from "./lib/patch-vocab.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const WRITE = args.includes("--write");
const APPEND = args.includes("--append-sup");
if (!file) {
	console.error(
		"Uso: node scripts/merge-lesson-vocab.mjs <crudo.md> [--write] [--append-sup]",
	);
	process.exit(2);
}

const raw = parseRawLesson(readFileSync(file, "utf8"));
if (raw.errors.length) {
	console.error(
		"❌ el archivo crudo tiene errores; corré parse-lesson.mjs primero:",
	);
	for (const e of raw.errors) console.error("  - " + e);
	process.exit(1);
}
if (!raw.vocabBlocks.length) {
	console.log("sin bloques de vocabulario; nada que hacer");
	process.exit(0);
}

const data = await import(join(ROOT, "data/index.js"));
const { normPinyin } = await import(join(ROOT, "js/dict.js"));
const b = raw.book;
const sources = [
	{
		name: b === 1 ? "B1_VOCAB" : "B2_VOCAB",
		path: join(ROOT, `data/book${b}-vocab.js`),
		arr: b === 1 ? data.B1_VOCAB : data.B2_VOCAB,
	},
	{
		name: b === 1 ? "B1_SUP" : "B2_SUP",
		path: join(ROOT, `data/book${b}-sup.js`),
		arr: b === 1 ? data.B1_SUP : data.B2_SUP,
	},
];

const onlyHan = (s) =>
	Array.from(s)
		.filter((c) => /\p{Script=Han}/u.test(c))
		.join("");
const pinyinKey = (s) => normPinyin(String(s).replace(/[()]/gu, ""));

// entradas candidatas: todas las no borradas de ambos arrays del libro
const entries = [];
for (const src of sources)
	src.arr.forEach((e, idx) => {
		if (!e._deleted) entries.push({ src, idx, e });
	});
// arrays del otro libro, solo para avisar de posibles duplicados cross-book
const otherBook = [
	...(b === 1 ? data.B2_VOCAB : data.B1_VOCAB),
	...(b === 1 ? data.B2_SUP : data.B1_SUP),
].filter((e) => !e._deleted);

const matched = []; // {src, idx, e, item, sec}
const toAppend = []; // items sin entrada
const ambiguous = [];
const discrepancies = [];
const crossLesson = [];

for (const block of raw.vocabBlocks) {
	for (const item of block.items) {
		let cands = entries.filter((c) => c.e.h === item.h);
		if (!cands.length)
			cands = entries.filter(
				(c) => onlyHan(c.e.h) === onlyHan(item.h) && onlyHan(item.h),
			);
		if (cands.length > 1) {
			const byPinyin = cands.filter(
				(c) => pinyinKey(c.e.p) === pinyinKey(item.p),
			);
			if (byPinyin.length) cands = byPinyin;
		}
		if (cands.length > 1) {
			const byLesson = cands.filter((c) => c.e.l === raw.lesson);
			if (byLesson.length) cands = byLesson;
		}
		if (!cands.length) {
			toAppend.push({ item, sec: block.sec });
			continue;
		}
		if (cands.length > 1) {
			ambiguous.push({ item, cands });
			continue;
		}
		const c = cands[0];
		const isCrossLesson = c.e.l !== raw.lesson;
		matched.push({ ...c, item, sec: block.sec, isCrossLesson });
		if (isCrossLesson)
			crossLesson.push(
				`${item.h}: el índice lo asigna a L${c.e.l}, el bloque es de L${raw.lesson}`,
			);
		if (pinyinKey(c.e.p) !== pinyinKey(item.p))
			discrepancies.push(
				`${item.h}: pinyin difiere — data '${c.e.p}' vs libro '${item.p}'`,
			);
		else if (c.e.p.replace(/\s+/gu, "") !== item.p.replace(/\s+/gu, ""))
			discrepancies.push(
				`${item.h}: tonos/grafía difieren — data '${c.e.p}' vs libro '${item.p}'`,
			);
		if ((c.e.pos || "") !== item.pos && item.pos)
			discrepancies.push(
				`${item.h}: POS difiere — data '${c.e.pos || "∅"}' vs libro '${item.pos}'`,
			);
		if (c.e.sec != null && (c.e.sec !== block.sec || c.e.ord !== item.n))
			discrepancies.push(
				`${item.h}: ya tenía sec/ord ${c.e.sec}/${c.e.ord}, ahora ${block.sec}/${item.n}`,
			);
	}
}

// entradas del índice de esta lección que ningún bloque menciona
const matchedSet = new Set(matched.map((m) => m.e));
const indexOnly = entries.filter(
	(c) => c.e.l === raw.lesson && !matchedSet.has(c.e),
);

// ---------- informe ----------
console.log(
	`L${raw.lesson} (Book ${b}): ${matched.length} emparejadas, ` +
		`${toAppend.length} nuevas, ${ambiguous.length} ambiguas, ` +
		`${indexOnly.length} solo-índice`,
);
if (crossLesson.length) {
	console.log(`\n⚠️  lección cruzada (revisar 'l' a mano):`);
	for (const w of crossLesson) console.log("  - " + w);
}
if (discrepancies.length) {
	console.log(`\n⚠️  discrepancias (mejoras manuales, no se escriben solas):`);
	for (const d of discrepancies) console.log("  - " + d);
}
if (ambiguous.length) {
	console.log(`\n❌ ambiguas (resolver a mano, no se escriben):`);
	for (const a of ambiguous)
		console.log(
			`  - ${a.item.h} '${a.item.p}': candidatas ` +
				a.cands
					.map((c) => `${c.src.name}[${c.idx}] p:'${c.e.p}' l:${c.e.l}`)
					.join(" | "),
		);
}
if (toAppend.length) {
	// dict.js marca _deleted en runtime a los duplicados exactos entre libros:
	// añadirlos no sirve (la entrada nunca aparece). Se excluyen del append.
	const crossDup = [];
	const appendable = [];
	for (const t of toAppend) {
		const dup = otherBook.find(
			(e) => e.h === t.item.h && pinyinKey(e.p) === pinyinKey(t.item.p),
		);
		if (dup) crossDup.push({ t, dup });
		else appendable.push(t);
	}
	toAppend.length = 0;
	toAppend.push(...appendable);
	if (appendable.length) {
		console.log(
			`\nnuevas para ${sources[1].name} (${APPEND ? "se añaden" : "usar --append-sup"}):`,
		);
		for (const t of appendable)
			console.log(
				`  - ${t.item.h} | ${t.item.p} | ${t.item.pos} | ${t.item.gloss}`,
			);
	}
	if (crossDup.length) {
		console.log(
			"\n⚠️  ya existen en el otro libro (NO se añaden — dict.js las borraría " +
				"en runtime; decidir a mano):",
		);
		for (const { t, dup } of crossDup)
			console.log(
				`  - ${t.item.h} '${t.item.p}' (bloque ${t.sec}#${t.item.n}) — ` +
					`otro libro l:${dup.l} '${dup.es}'`,
			);
	}
}
if (indexOnly.length) {
	console.log(`\nsolo-índice (quedan sin sec/ord, ok):`);
	for (const c of indexOnly)
		console.log(`  - ${c.src.name}[${c.idx}] ${c.e.h} '${c.e.p}'`);
}

if (!WRITE && !APPEND) {
	console.log("\n(dry-run: nada escrito; usá --write y/o --append-sup)");
	process.exit(0);
}

// ---------- escritura ----------
// Agrupar por archivo y aplicar en orden de índice; upsertFields re-escanea
// el fuente en cada llamada, así que los offsets siempre están frescos.
if (WRITE) {
	for (const src of sources) {
		const mine = matched.filter((m) => m.src === src);
		if (!mine.length) continue;
		let text = readFileSync(src.path, "utf8");
		for (const m of mine) {
			// cross-lesson: sec/ord are relative to l; never write across lessons
			if (m.isCrossLesson) continue;
			// sub-entries (5a, 5b) lack an independent book number
			if (/[a-z]$/.test(m.item.n)) continue;
			const fields = { sec: m.sec, ord: parseInt(m.item.n, 10) };
			if (m.sec === 4) fields.extra = true;
			text = upsertFields(text, src.name, m.idx, fields);
		}
		writeFileSync(src.path, text);
		console.log(`\n✏️  ${src.path}: sec/ord en ${mine.length} entradas`);
	}
}
if (APPEND && toAppend.length) {
	const sup = sources[1];
	let text = readFileSync(sup.path, "utf8");
	for (const t of toAppend)
		text = appendEntry(
			text,
			sup.name,
			formatVocabEntry({
				h: t.item.h,
				p: t.item.p,
				pos: t.item.pos,
				es: t.item.gloss,
				en: "",
				l: raw.lesson,
				tags: ["npcr"],
				sec: t.sec,
				ord: parseInt(t.item.n, 10),
				...(t.sec === 4 ? { extra: true } : {}),
			}),
		);
	writeFileSync(sup.path, text);
	console.log(
		`\n✏️  ${sup.path}: +${toAppend.length} entradas — RELLENAR en:"" ` +
			"(validate-data va a fallar hasta entonces)",
	);
}
console.log(
	"\nSiguiente: rellenar 'en' si hubo appends, aplicar mejoras de las " +
		"discrepancias, y correr node scripts/validate-data.mjs + biome.",
);
