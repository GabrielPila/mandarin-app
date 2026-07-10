// lesson-raw.mjs — parser del formato de extracción cruda por lección
// (extraction/book{1,2}_lessons/L<nn>.md). Formato: docs/EXTRACTION-PLAN.md.
// Devuelve estructura + errores/avisos; no toca el disco.
import { isHan, syllables } from "../../js/dict.js";

// Encabezados de bloques de vocabulario -> valor de `sec`
export const SEC_HEADERS = new Map([
	["palabras nuevas 1", 1],
	["palabras nuevas 2", 2],
	["palabras suplementarias", 3],
	["vocabulario adicional", 4],
]);

export const KNOWN_SECTIONS = [
	"notas",
	"gramática",
	"ejercicio de fonética",
	"ejercicios",
	"comprensión de lectura",
];

const TITLE_RE = /^# Book ([12]) — Lección (\d+)\b(.*)$/u;
// \d+[a-z]? supports sub-entries like 5a, 5b (unnumbered book sub-items)
const ITEM_RE =
	/^(\d+[a-z]?)\.\s+(.+?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.+)$/u;
const ILEGIBLE_RE = /\[ILEGIBLE p\.\s*\d+\]/u;

const norm = (s) =>
	s.toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();

// Divide `text` en secciones `## ` y subsecciones `### `.
function splitSections(lines) {
	const sections = [];
	let cur = null;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.startsWith("## ")) {
			cur = {
				header: line
					.slice(3)
					.replace(/<!--.*?-->/g, "")
					.trim(),
				lineNo: i + 1,
				lines: [],
			};
			sections.push(cur);
		} else if (cur) {
			cur.lines.push({ text: line, lineNo: i + 1 });
		}
	}
	return sections;
}

function splitSubsections(sec) {
	const subs = [];
	let cur = null;
	const intro = [];
	for (const ln of sec.lines) {
		if (ln.text.startsWith("### ")) {
			cur = { title: ln.text.slice(4).trim(), lineNo: ln.lineNo, lines: [] };
			subs.push(cur);
		} else if (cur) {
			cur.lines.push(ln);
		} else if (ln.text.trim()) {
			intro.push(ln);
		}
	}
	return { intro, subs };
}

function parseVocabBlock(sec, secNum, out) {
	const block = {
		sec: secNum,
		header: sec.header,
		lineNo: sec.lineNo,
		items: [],
	};
	let prevN = 0;
	for (const ln of sec.lines) {
		const t = ln.text.trim();
		if (!t || t.startsWith("<!--")) continue;
		if (ILEGIBLE_RE.test(t)) {
			out.warnings.push(
				`línea ${ln.lineNo}: marcador ILEGIBLE en '${sec.header}'`,
			);
			continue;
		}
		const m = t.match(ITEM_RE);
		if (!m) {
			out.errors.push(
				`línea ${ln.lineNo}: no coincide con 'n. hanzi | pinyin | POS | gloss': '${t}'`,
			);
			continue;
		}
		const item = {
			// number for regular items; string like "5a" for sub-entries
			n: /[a-z]$/.test(m[1]) ? m[1] : Number(m[1]),
			h: m[2].trim(),
			p: m[3].trim(),
			pos: m[4].trim(),
			gloss: m[5].trim(),
			lineNo: ln.lineNo,
		};
		const isSub = /[a-z]$/.test(item.n);
		const nBase = parseInt(item.n, 10);
		if (!isSub && nBase !== prevN + 1)
			out.warnings.push(
				`línea ${ln.lineNo}: numeración ${item.n} tras ${prevN} en '${sec.header}'`,
			);
		if (!isSub) prevN = nBase;
		if (!item.p)
			out.errors.push(`línea ${ln.lineNo}: falta pinyin para ${item.h}`);
		if (!item.gloss)
			out.errors.push(`línea ${ln.lineNo}: falta gloss para ${item.h}`);
		// alineación pinyin ↔ caracteres (misma regla que validate-data)
		const hanChars = Array.from(item.h).filter(isHan);
		if (!hanChars.length && !isSub)
			out.warnings.push(
				`línea ${ln.lineNo}: '${item.h}' no tiene hanzi — ¿están pinyin y hanzi intercambiados?`,
			);
		if (item.p && hanChars.length) {
			const chars = Array.from(item.h.replace(/[^\p{Script=Han}儿]/gu, ""));
			const syls = syllables({ h: chars.join(""), p: item.p });
			if (syls.length !== chars.length)
				out.errors.push(
					`línea ${ln.lineNo}: ${item.h}: ${chars.length} caracteres pero ` +
						`sílabas no alineadas ('${item.p}')`,
				);
			else if (
				syls.some((s, k) => s === "" && chars[k] !== "儿" && isHan(chars[k]))
			)
				out.errors.push(
					`línea ${ln.lineNo}: ${item.h}: sílaba vacía no-erhua ('${item.p}')`,
				);
		}
		if (block.items.some((x) => x.n === item.n))
			out.errors.push(`línea ${ln.lineNo}: número ${item.n} repetido`);
		block.items.push(item);
	}
	if (!block.items.length)
		out.warnings.push(`'${sec.header}' (línea ${sec.lineNo}) está vacío`);
	out.vocabBlocks.push(block);
}

function parseEjercicios(sec, out) {
	const { intro, subs } = splitSubsections(sec);
	for (const ln of intro)
		out.warnings.push(
			`línea ${ln.lineNo}: texto fuera de '### Ejercicio …' en Ejercicios`,
		);
	for (const sub of subs) {
		const m = sub.title.match(
			/^Ejercicio\s+([IVXLC]+|\d+|G\d+-[IVXLC]+)\s*(?:—|-)?\s*(.*)$/u,
		);
		if (!m) {
			out.errors.push(
				`línea ${sub.lineNo}: título de ejercicio inválido: '${sub.title}'`,
			);
			continue;
		}
		const audio = /\(audio\)/i.test(sub.title);
		const ej = {
			n: m[1],
			instruction: m[2].replace(/\(audio\)/i, "").trim(),
			audio,
			lineNo: sub.lineNo,
			lines: sub.lines.map((l) => l.text).filter((t) => t.trim()),
		};
		if (!ej.instruction)
			out.warnings.push(
				`línea ${sub.lineNo}: ejercicio ${ej.n} sin instrucción`,
			);
		if (audio && ej.lines.length)
			out.warnings.push(
				`línea ${sub.lineNo}: ejercicio ${ej.n} marcado (audio) pero tiene items`,
			);
		if (!audio && !ej.lines.length)
			out.warnings.push(`línea ${sub.lineNo}: ejercicio ${ej.n} sin items`);
		out.ejercicios.push(ej);
	}
}

function parseTitled(sec, out, key, titleRe, label) {
	const { intro, subs } = splitSubsections(sec);
	for (const ln of intro)
		out.warnings.push(`línea ${ln.lineNo}: texto fuera de '###' en ${label}`);
	for (const sub of subs) {
		const m = titleRe ? sub.title.match(titleRe) : null;
		if (titleRe && !m) {
			out.errors.push(
				`línea ${sub.lineNo}: título inválido en ${label}: '${sub.title}'`,
			);
			continue;
		}
		const entry = {
			title: sub.title,
			n: m ? Number(m[1]) : undefined,
			rest: m ? (m[2] || "").trim() : sub.title,
			lineNo: sub.lineNo,
			lines: sub.lines.map((l) => l.text).filter((t) => t.trim()),
		};
		if (!entry.lines.length)
			out.warnings.push(`línea ${sub.lineNo}: '${sub.title}' sin contenido`);
		out[key].push(entry);
	}
}

// API principal.
export function parseRawLesson(text) {
	const lines = text.split("\n");
	const out = {
		book: null,
		lesson: null,
		titleRest: "",
		vocabBlocks: [],
		notas: [],
		gramatica: [],
		fonetica: [], // líneas crudas
		ejercicios: [],
		lecturas: [],
		extras: [], // secciones ## no previstas, se conservan
		errors: [],
		warnings: [],
	};

	const title = lines.find((l) => l.startsWith("# "));
	const tm = title?.match(TITLE_RE);
	if (!tm) {
		out.errors.push(
			"falta título '# Book <1|2> — Lección <n> …' en la primera línea '# '",
		);
	} else {
		out.book = Number(tm[1]);
		out.lesson = Number(tm[2]);
		out.titleRest = tm[3].trim();
		const [lo, hi] = out.book === 1 ? [0, 10] : [11, 20];
		if (out.lesson < lo || out.lesson > hi)
			out.errors.push(
				`lección ${out.lesson} fuera de rango para Book ${out.book}`,
			);
	}

	for (const sec of splitSections(lines)) {
		const h = norm(sec.header);
		if (SEC_HEADERS.has(h)) {
			parseVocabBlock(sec, SEC_HEADERS.get(h), out);
		} else if (h === "notas") {
			parseTitled(sec, out, "notas", /^N(\d+)\s*(.*)$/u, "Notas");
		} else if (h === "gramática" || h === "gramatica") {
			parseTitled(sec, out, "gramatica", /^G(\d+)\s*(.*)$/u, "Gramática");
		} else if (
			h === "ejercicio de fonética" ||
			h === "ejercicios de fonética"
		) {
			out.fonetica.push(
				...sec.lines.map((l) => l.text).filter((t) => t.trim()),
			);
		} else if (h === "ejercicios") {
			parseEjercicios(sec, out);
		} else if (
			h === "comprensión de lectura" ||
			h === "comprension de lectura"
		) {
			parseTitled(sec, out, "lecturas", null, "Comprensión de Lectura");
		} else {
			out.warnings.push(
				`línea ${sec.lineNo}: sección no prevista '## ${sec.header}' — ` +
					"conservada como extra (ver plan)",
			);
			out.extras.push({
				header: sec.header,
				lineNo: sec.lineNo,
				lines: sec.lines.map((l) => l.text),
			});
		}
	}

	const secsSeen = out.vocabBlocks.map((b) => b.sec);
	if (new Set(secsSeen).size !== secsSeen.length)
		out.errors.push(
			"bloque de vocabulario repetido (mismo encabezado dos veces)",
		);
	if (!out.vocabBlocks.length)
		out.warnings.push("sin bloques de Palabras Nuevas");

	return out;
}
