// dict.js — diccionario combinado, segmentación y utilidades de pinyin
import { B1_VOCAB, B1_SUP, B2_VOCAB, B2_SUP } from "../data/index.js";

// ---------- Diccionario ----------
// INVARIANTE: los ids son posiciones de array (b1:i, b1s:i, b2:i, b2s:i).
// Nunca reordenar/borrar entradas de los arrays de datos; solo añadir al final.
export const ALL = [];
const seen = new Set();
function add(e, idStr, book) {
	e.id = idStr;
	e.book = book;
	const key = `${e.h}|${e.p}|${e.pos || ""}`;
	if (seen.has(key)) {
		e._deleted = true;
	} else {
		seen.add(key);
	}
	ALL.push(e);
}
B1_VOCAB.forEach((e, i) => add(e, "b1:" + i, 1));
B1_SUP.forEach((e, i) => add(e, "b1s:" + i, 1));
B2_VOCAB.forEach((e, i) => add(e, "b2:" + i, 2));
B2_SUP.forEach((e, i) => add(e, "b2s:" + i, 2));

export const DICT = new Map(); // hanzi -> [entradas]
let MAXLEN = 1;
for (const e of ALL) {
	if (e._deleted) continue;
	if (!DICT.has(e.h)) DICT.set(e.h, []);
	DICT.get(e.h).push(e);
	if (e.h.length > MAXLEN) MAXLEN = e.h.length;
}

export const isHan = (ch) => /[㐀-鿿豈-﫿]/.test(ch);

// ---------- Segmentación (longest match) ----------
export function segment(text) {
	const tokens = [];
	let i = 0;
	while (i < text.length) {
		const ch = text[i];
		if (!isHan(ch)) {
			let j = i + 1;
			while (j < text.length && !isHan(text[j])) j++;
			tokens.push({ t: text.slice(i, j), plain: true });
			i = j;
			continue;
		}
		let matched = null;
		for (let len = Math.min(MAXLEN, text.length - i); len >= 1; len--) {
			const cand = text.slice(i, i + len);
			if (DICT.has(cand)) {
				matched = cand;
				break;
			}
		}
		if (matched) {
			tokens.push({ t: matched, entries: DICT.get(matched) });
			i += matched.length;
		} else {
			tokens.push({ t: ch, plain: true });
			i += 1;
		}
	}
	return tokens;
}

// ---------- Pinyin / tonos ----------
const TONED = {
	1: "āēīōūǖĀĒĪŌŪǕ",
	2: "áéíóúǘÁÉÍÓÚǗ",
	3: "ǎěǐǒǔǚǍĚǏǑǓǙ",
	4: "àèìòùǜÀÈÌÒÙǛ",
};
export function toneOf(syl) {
	for (const t of ["1", "2", "3", "4"]) {
		for (const c of TONED[t]) if (syl.includes(c)) return +t;
	}
	return 0; // neutro
}
export const TONE_MARK = ["·", "ˉ", "ˊ", "ˇ", "ˋ"];

// Normaliza pinyin para búsqueda: sin tonos, sin espacios ni separadores.
// "péng you" y "pengyou" y "peng" coinciden todos.
export function normPinyin(s) {
	return s
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[\s'’ʼ\-]/g, "")
		.toLowerCase();
}

// divide el pinyin de una palabra en sílabas alineadas con sus caracteres
export function syllables(entry) {
	const syls = entry.p.split(/[\s'\-]+/).filter((s) => s.length);
	const chars = Array.from(entry.h);
	if (syls.length === chars.length) return syls;
	// erhua: última sílaba termina en r y hay un 儿 extra
	if (chars.length === syls.length + 1 && chars[chars.length - 1] === "儿") {
		return syls.concat([""]);
	}
	// desalineado: repartir lo mejor posible
	const out = [];
	for (let i = 0; i < chars.length; i++) out.push(syls[i] || "");
	return out;
}
