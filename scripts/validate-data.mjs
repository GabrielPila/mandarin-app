// validate-data.mjs — validación de los datos de contenido.
// Uso: node scripts/validate-data.mjs   (sale con código 1 si hay errores)
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const {
	B1_VOCAB,
	B1_SUP,
	B2_VOCAB,
	B2_SUP,
	B1_TEXTS,
	B2_TEXTS,
	B1_READINGS,
	B2_READINGS,
	GRAMMAR,
	B1_NOTES,
	B2_NOTES,
	B1_GRAMMAR_BOOK,
	B2_GRAMMAR_BOOK,
	B1_EXERCISES,
	B2_EXERCISES,
	B1_PHONETICS,
	B2_PHONETICS,
	B1_LECTURAS,
	B2_LECTURAS,
} = await import(join(ROOT, "data/index.js"));
const { ALL, segment, syllables, isHan } = await import(
	join(ROOT, "js/dict.js")
);

const errors = [],
	warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ---------- vocabulario ----------
const VALID_TAG = /^(hsk[1-6]|npcr.*)$/;
const seen = new Map();
const secOrd = new Map();
const vocabSets = [
	["B1_VOCAB", B1_VOCAB],
	["B1_SUP", B1_SUP],
	["B2_VOCAB", B2_VOCAB],
	["B2_SUP", B2_SUP],
];
for (const [name, arr] of vocabSets) {
	arr.forEach((e, i) => {
		if (e._deleted) return;
		const where = `${name}[${i}] ${e.h}`;
		if (!e.h || !e.p) {
			err(`${where}: falta h o p`);
			return;
		}
		if (!(e.l >= 0 && e.l <= 20)) err(`${where}: lección inválida ${e.l}`);
		if (!e.es || !e.en) err(`${where}: falta gloss es/en`);
		if (e.tags)
			for (const t of e.tags)
				if (!VALID_TAG.test(t)) err(`${where}: tag inválido '${t}'`);
		if (
			e.ex &&
			!(
				Array.isArray(e.ex) &&
				e.ex.length === 3 &&
				e.ex.every((x) => typeof x === "string" && x)
			)
		)
			err(`${where}: ex debe ser [zh,es,en]`);
		// alineación pinyin ↔ caracteres
		const hanChars = Array.from(e.h).filter(isHan);
		if (hanChars.length) {
			const syls = syllables(e);
			const chars = Array.from(e.h);
			if (syls.length !== chars.length)
				err(
					`${where}: ${chars.length} caracteres pero ${syls.length} sílabas alineadas ('${e.p}')`,
				);
			else if (
				syls.some((s, k) => s === "" && chars[k] !== "儿" && isHan(chars[k]))
			)
				err(`${where}: sílaba vacía en posición no-erhua ('${e.p}')`);
		}
		const key = `${e.h}|${e.p}|${e.pos || ""}`;
		if (seen.has(key)) warn(`duplicado ${key} en ${seen.get(key)} y ${where}`);
		else seen.set(key, where);
		// sec/ord: bloque de Palabras Nuevas y orden dentro del bloque
		if (e.sec != null || e.ord != null) {
			if (!(Number.isInteger(e.sec) && e.sec >= 1 && e.sec <= 4))
				err(`${where}: sec inválido '${e.sec}' (1-4, junto con ord)`);
			if (!(Number.isInteger(e.ord) && e.ord >= 1))
				err(`${where}: ord inválido '${e.ord}' (entero ≥1, junto con sec)`);
			const okey = `b${name[1]} L${e.l} sec${e.sec} ord${e.ord}`;
			if (secOrd.has(okey))
				err(`${where}: sec/ord duplicado (${okey}) con ${secOrd.get(okey)}`);
			else secOrd.set(okey, where);
		}
	});
}

// ---------- textos: esquema + cobertura del diccionario ----------
const missing = new Map(); // char -> [dónde]
function checkLine(zh, where) {
	if (typeof zh !== "string" || !zh) {
		err(`${where}: línea zh vacía`);
		return;
	}
	for (const tok of segment(zh)) {
		if (tok.plain) {
			for (const ch of tok.t)
				if (isHan(ch)) {
					if (!missing.has(ch)) missing.set(ch, []);
					if (missing.get(ch).length < 3) missing.get(ch).push(where);
				}
		}
	}
}
for (const [name, texts] of [
	["B1_TEXTS", B1_TEXTS],
	["B2_TEXTS", B2_TEXTS],
]) {
	texts.forEach((t) => {
		if (!t.l || !t.t || !t.tes || !t.ten || !Array.isArray(t.parts))
			err(`${name} L${t.l}: esquema inválido`);
		t.parts.forEach((p, pi) => {
			if (!p.ies || !p.ien)
				err(`${name} L${t.l} parte ${pi + 1}: falta intro es/en`);
			p.lines.forEach((ln, li) => {
				const where = `${name} L${t.l}.${pi + 1}#${li + 1}`;
				if (!ln.es || !ln.en) err(`${where}: falta traducción`);
				checkLine(ln.zh, where);
				if (ln.s) checkLine(ln.s, where + " (hablante)");
			});
		});
	});
}
for (const [name, reads] of [
	["B1_READINGS", B1_READINGS],
	["B2_READINGS", B2_READINGS],
]) {
	reads.forEach((t) => {
		if (!t.l || !t.t || !Array.isArray(t.lines))
			err(`${name} L${t.l}: esquema inválido`);
		t.lines.forEach((ln, li) => {
			const where = `${name} L${t.l}#${li + 1}`;
			if (!ln.es || !ln.en) err(`${where}: falta traducción`);
			checkLine(ln.zh, where);
		});
	});
}
GRAMMAR.forEach((g) => {
	if (!g.id || !g.title || !g.desc || !Array.isArray(g.examples))
		err(`GRAMMAR ${g.id || "?"}: esquema inválido`);
	(g.examples || []).forEach((ex, i) =>
		checkLine(ex.zh, `GRAMMAR ${g.id}#${i + 1}`),
	);
});
// ---------- contenido por lección (Fase 4 del plan de extracción) ----------
for (const [name, notes] of [
	["B1_NOTES", B1_NOTES],
	["B2_NOTES", B2_NOTES],
]) {
	notes.forEach((n, i) => {
		const where = `${name}[${i}]`;
		if (!(n.l >= 0 && n.l <= 20) || !n.n || !n.es || !n.en)
			err(`${where}: esquema inválido (l, n, es, en)`);
		if (n.sec != null && !(n.sec >= 1 && n.sec <= 4))
			err(`${where}: sec inválido ${n.sec}`);
		if (n.zh) checkLine(n.zh, where);
	});
}
for (const [name, gs] of [
	["B1_GRAMMAR_BOOK", B1_GRAMMAR_BOOK],
	["B2_GRAMMAR_BOOK", B2_GRAMMAR_BOOK],
]) {
	const ids = new Set();
	gs.forEach((g, i) => {
		const where = `${name}[${i}] ${g.id || "?"}`;
		if (!g.id || !(g.l >= 0 && g.l <= 20) || !g.title || !g.es || !g.en)
			err(`${where}: esquema inválido (id, l, title, es, en)`);
		if (ids.has(g.id)) err(`${where}: id duplicado`);
		ids.add(g.id);
		if (!Array.isArray(g.examples)) err(`${where}: falta examples[]`);
		(g.examples || []).forEach((ex, k) => {
			if (!ex.es || !ex.en) err(`${where}#${k + 1}: falta traducción`);
			checkLine(ex.zh, `${where}#${k + 1}`);
		});
	});
}
// Los ejercicios pueden citar caracteres fuera del vocabulario del libro;
// eso es aviso (no error) para no bloquear la extracción.
const missingWarn = new Map();
function checkLineSoft(zh, where) {
	if (typeof zh !== "string") return;
	for (const tok of segment(zh))
		if (tok.plain)
			for (const ch of tok.t)
				if (isHan(ch)) {
					if (!missingWarn.has(ch)) missingWarn.set(ch, []);
					if (missingWarn.get(ch).length < 3) missingWarn.get(ch).push(where);
				}
}
for (const [name, exs] of [
	["B1_EXERCISES", B1_EXERCISES],
	["B2_EXERCISES", B2_EXERCISES],
]) {
	exs.forEach((x, i) => {
		const where = `${name}[${i}] L${x.l} ej.${x.n}`;
		if (!(x.l >= 0 && x.l <= 20) || !x.n || !x.ies || !x.ien)
			err(`${where}: esquema inválido (l, n, ies, ien)`);
		if (typeof x.audio !== "boolean" || !Array.isArray(x.items))
			err(`${where}: falta audio:boolean o items[]`);
		if (x.audio && x.items?.length)
			warn(`${where}: audio:true pero tiene items`);
		(x.items || []).forEach((it, k) => {
			if (it.zh) checkLineSoft(it.zh, `${where}#${k + 1}`);
			if (it.ans) checkLineSoft(it.ans, `${where}#${k + 1}`);
		});
	});
}
for (const [name, phs] of [
	["B1_PHONETICS", B1_PHONETICS],
	["B2_PHONETICS", B2_PHONETICS],
]) {
	phs.forEach((ph, i) => {
		const where = `${name}[${i}] L${ph.l}`;
		if (!(ph.l >= 0 && ph.l <= 20) || !Array.isArray(ph.drills))
			err(`${where}: esquema inválido (l, drills[])`);
		(ph.drills || []).forEach((d, k) => {
			if (!d.label || !Array.isArray(d.p) || !d.p.length)
				err(`${where} drill ${k + 1}: falta label o p[]`);
		});
	});
}
for (const [name, lects] of [
	["B1_LECTURAS", B1_LECTURAS],
	["B2_LECTURAS", B2_LECTURAS],
]) {
	lects.forEach((t, i) => {
		if (!t.l || !t.t || !t.tes || !t.ten || !Array.isArray(t.lines))
			err(`${name}[${i}] L${t.l || "?"}: esquema inválido`);
		(t.lines || []).forEach((ln, li) => {
			const where = `${name} L${t.l}#${li + 1}`;
			if (!ln.es || !ln.en) err(`${where}: falta traducción`);
			checkLine(ln.zh, where);
		});
		(t.preguntas || []).forEach((q, qi) => {
			const where = `${name} L${t.l} pregunta ${qi + 1}`;
			if (!q.es || !q.en) err(`${where}: falta traducción`);
			checkLine(q.zh, where);
		});
	});
}

for (const [ch, wheres] of missing)
	err(`carácter sin entrada de diccionario: ${ch} (${wheres.join("; ")})`);
for (const [ch, wheres] of missingWarn)
	if (!missing.has(ch))
		warn(
			`carácter sin diccionario (solo ejercicios): ${ch} (${wheres.join("; ")})`,
		);

// ---------- service worker: lista de assets ----------
const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
const m = sw.match(/ASSETS\s*=\s*\[([\s\S]*?)\]/);
if (!m) err("sw.js: no se encontró la lista ASSETS");
else {
	const listed = [...m[1].matchAll(/(["'])([^"']+)\1/g)]
		.map((x) => x[2])
		.filter((a) => !a.startsWith("http") && a !== ".");
	for (const a of listed)
		if (!existsSync(join(ROOT, a)))
			err(`sw.js ASSETS: '${a}' no existe en disco`);
	const onDisk = [];
	for (const dir of ["js", "data", "css", "js/views", "js/views/practice"]) {
		const full = join(ROOT, dir);
		if (!existsSync(full)) continue;
		for (const f of readdirSync(full))
			if (f.endsWith(".js") || f.endsWith(".css")) {
				const rel = `${dir}/${f}`;
				if (!onDisk.includes(rel)) onDisk.push(rel);
			}
	}
	for (const f of onDisk)
		if (!listed.includes(f)) err(`sw.js ASSETS: falta '${f}'`);
}

// ---------- informe ----------
console.log(`Entradas de vocabulario: ${ALL.length}`);
if (warnings.length) {
	console.log(`\n⚠️  ${warnings.length} avisos:`);
	warnings.forEach((w) => console.log("  - " + w));
}
if (errors.length) {
	console.error(`\n❌ ${errors.length} errores:`);
	errors.forEach((e) => console.error("  - " + e));
	process.exit(1);
}
console.log("✅ datos válidos");
