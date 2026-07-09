// concordance.js — índice palabra → líneas de texto donde aparece
import { B1_TEXTS, B2_TEXTS, B1_READINGS, B2_READINGS } from "../data/index.js";
import { segment } from "./dict.js";

let INDEX = null; // Map<hanzi, [{zh, es, en, source}]>

function add(map, zh, es, en, source) {
	const seen = new Set();
	for (const tok of segment(zh)) {
		if (tok.plain) continue;
		if (seen.has(tok.t)) continue; // una línea cuenta una vez por palabra
		seen.add(tok.t);
		if (!map.has(tok.t)) map.set(tok.t, []);
		map.get(tok.t).push({ zh, es, en, source });
	}
}

export function build() {
	if (INDEX) return INDEX;
	INDEX = new Map();
	for (const [texts, label] of [
		[B1_TEXTS, "L"],
		[B2_TEXTS, "L"],
	]) {
		texts.forEach((t) =>
			t.parts.forEach((p) =>
				p.lines.forEach((ln) =>
					add(INDEX, ln.zh, ln.es, ln.en, {
						type: "dialog",
						lesson: t.l,
						title: t.t,
					}),
				),
			),
		);
	}
	for (const reads of [B1_READINGS, B2_READINGS]) {
		reads.forEach((t) =>
			t.lines.forEach((ln) =>
				add(INDEX, ln.zh, ln.es, ln.en, {
					type: "reading",
					lesson: t.l,
					title: t.t,
				}),
			),
		);
	}
	return INDEX;
}

// Líneas que contienen exactamente la palabra `word`.
export function usesOf(word, limit = 8) {
	const idx = build();
	return (idx.get(word) || []).slice(0, limit);
}

// Búsqueda libre: líneas cuyo texto contiene la subcadena `q` (hanzi).
export function search(q, limit = 30) {
	const idx = build();
	const out = [],
		seen = new Set();
	for (const arr of idx.values()) {
		for (const ln of arr) {
			if (ln.zh.includes(q) && !seen.has(ln.zh)) {
				seen.add(ln.zh);
				out.push(ln);
				if (out.length >= limit) return out;
			}
		}
	}
	return out;
}
