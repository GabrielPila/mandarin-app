// dict.js — diccionario combinado, segmentación y utilidades de pinyin
import { B1_VOCAB, B1_SUP, B2_VOCAB, B2_SUP, CUSTOM_VOCAB } from "../data/index.js";

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
CUSTOM_VOCAB.forEach((e, i) => add(e, "custom:" + i, 0));

export const BOOK_ALL = ALL.filter((e) => !e.custom);
export const GENERAL_ALL = ALL.filter((e) => e.custom && !e._deleted);

export const DICT = new Map(); // hanzi -> [entradas]
let MAXLEN = 1;
for (const e of ALL) {
	if (e._deleted) continue;
	if (!DICT.has(e.h)) DICT.set(e.h, []);
	DICT.get(e.h).push(e);
	if (e.h.length > MAXLEN) MAXLEN = e.h.length;
}

export function registerExternalVocabulary(entries, source = "Personal reading") {
	for (const entry of entries || []) {
		const existing = DICT.get(entry.h)?.find((candidate) =>
			normPinyin(candidate.p) === normPinyin(entry.p) &&
			candidate.en === entry.en && candidate.es === entry.es);
		if (existing) {
			existing.sources = [...new Set([...(existing.sources || []), source])];
			entry._dictionaryEntry = existing;
			continue;
		}
		const e = { ...entry, custom: true, source, l: 0, tags: ["general", "reading"],
			id: `reading:${source}:${entry.h}:${normPinyin(entry.p)}:${entry.en}` };
		ALL.push(e);
		if (!DICT.has(e.h)) DICT.set(e.h, []);
		DICT.get(e.h).push(e);
		MAXLEN = Math.max(MAXLEN, e.h.length);
		entry._dictionaryEntry = e;
	}
}

export function externalVocabularyDictionary(entries) {
	const dictionary = new Map();
	for (const entry of entries || []) {
		const value = entry._dictionaryEntry || entry;
		if (!dictionary.has(entry.h)) dictionary.set(entry.h, []);
		dictionary.get(entry.h).push(value);
	}
	return dictionary;
}

export const isHan = (ch) => /[㐀-鿿豈-﫿]/.test(ch);

// ---------- Segmentación ----------
// Choose the path with the greatest overall dictionary coverage. A purely
// greedy longest match turns 写作业 into 写作 + unknown 业 even though the
// better reading is 写 + 作业.
function segmentHan(run, localDictionary) {
	const dp = Array(run.length + 1);
	dp[run.length] = { known: 0, count: 0, firstLength: 0, tokens: [] };
	const better = (candidate, current) =>
		candidate.known > current.known ||
		(candidate.known === current.known && candidate.count < current.count) ||
		(candidate.known === current.known && candidate.count === current.count && candidate.firstLength > current.firstLength);
	for (let i = run.length - 1; i >= 0; i--) {
		const unknownTail = dp[i + 1];
		let best = { known: unknownTail.known, count: unknownTail.count + 1, firstLength: 1,
			tokens: [{ t: run[i], plain: true }, ...unknownTail.tokens] };
		for (let length = Math.min(MAXLEN, run.length - i); length >= 1; length--) {
			const word = run.slice(i, i + length);
			const entries = localDictionary?.get(word) || DICT.get(word);
			if (!entries) continue;
			const tail = dp[i + length];
			const candidate = { known: tail.known + length, count: tail.count + 1, firstLength: length,
				tokens: [{ t: word, entries }, ...tail.tokens] };
			if (better(candidate, best)) best = candidate;
		}
		dp[i] = best;
	}
	return dp[0].tokens;
}

export function segment(text, localDictionary) {
	const tokens = [];
	let i = 0;
	while (i < text.length) {
		let j = i + 1;
		if (isHan(text[i])) {
			while (j < text.length && isHan(text[j])) j++;
			tokens.push(...segmentHan(text.slice(i, j), localDictionary));
		} else {
			while (j < text.length && !isHan(text[j])) j++;
			tokens.push({ t: text.slice(i, j), plain: true });
		}
		i = j;
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
