// validate-data.mjs — validación de los datos de contenido.
// Uso: node scripts/validate-data.mjs   (sale con código 1 si hay errores)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { B1_VOCAB, B1_SUP, B2_VOCAB, B2_SUP, B1_TEXTS, B2_TEXTS, B1_READINGS, B2_READINGS, GRAMMAR } =
  await import(join(ROOT, 'data/index.js'));
const { ALL, segment, syllables, isHan } = await import(join(ROOT, 'js/dict.js'));

const errors = [], warnings = [];
const err = m => errors.push(m);
const warn = m => warnings.push(m);

// ---------- vocabulario ----------
const VALID_TAG = /^(hsk[1-6]|npcr.*)$/;
const seen = new Map();
const vocabSets = [['B1_VOCAB', B1_VOCAB], ['B1_SUP', B1_SUP], ['B2_VOCAB', B2_VOCAB], ['B2_SUP', B2_SUP]];
for (const [name, arr] of vocabSets) {
  arr.forEach((e, i) => {
    const where = `${name}[${i}] ${e.h}`;
    if (!e.h || !e.p) { err(`${where}: falta h o p`); return; }
    if (!(e.l >= 0 && e.l <= 20)) err(`${where}: lección inválida ${e.l}`);
    if (!e.es || !e.en) err(`${where}: falta gloss es/en`);
    if (e.tags) for (const t of e.tags) if (!VALID_TAG.test(t)) err(`${where}: tag inválido '${t}'`);
    if (e.ex && !(Array.isArray(e.ex) && e.ex.length === 3 && e.ex.every(x => typeof x === 'string' && x)))
      err(`${where}: ex debe ser [zh,es,en]`);
    // alineación pinyin ↔ caracteres
    const hanChars = Array.from(e.h).filter(isHan);
    if (hanChars.length) {
      const syls = syllables(e);
      const chars = Array.from(e.h);
      if (syls.length !== chars.length)
        err(`${where}: ${chars.length} caracteres pero ${syls.length} sílabas alineadas ('${e.p}')`);
      else if (syls.some((s, k) => s === '' && chars[k] !== '儿' && isHan(chars[k])))
        err(`${where}: sílaba vacía en posición no-erhua ('${e.p}')`);
    }
    const key = `${e.h}|${e.p}|${e.pos || ''}`;
    if (seen.has(key)) warn(`duplicado ${key} en ${seen.get(key)} y ${where}`);
    else seen.set(key, where);
  });
}

// ---------- textos: esquema + cobertura del diccionario ----------
const missing = new Map(); // char -> [dónde]
function checkLine(zh, where) {
  if (typeof zh !== 'string' || !zh) { err(`${where}: línea zh vacía`); return; }
  for (const tok of segment(zh)) {
    if (tok.plain) {
      for (const ch of tok.t) if (isHan(ch)) {
        if (!missing.has(ch)) missing.set(ch, []);
        if (missing.get(ch).length < 3) missing.get(ch).push(where);
      }
    }
  }
}
for (const [name, texts] of [['B1_TEXTS', B1_TEXTS], ['B2_TEXTS', B2_TEXTS]]) {
  texts.forEach(t => {
    if (!t.l || !t.t || !t.tes || !t.ten || !Array.isArray(t.parts)) err(`${name} L${t.l}: esquema inválido`);
    t.parts.forEach((p, pi) => {
      if (!p.ies || !p.ien) err(`${name} L${t.l} parte ${pi + 1}: falta intro es/en`);
      p.lines.forEach((ln, li) => {
        const where = `${name} L${t.l}.${pi + 1}#${li + 1}`;
        if (!ln.es || !ln.en) err(`${where}: falta traducción`);
        checkLine(ln.zh, where);
        if (ln.s) checkLine(ln.s, where + ' (hablante)');
      });
    });
  });
}
for (const [name, reads] of [['B1_READINGS', B1_READINGS], ['B2_READINGS', B2_READINGS]]) {
  reads.forEach(t => {
    if (!t.l || !t.t || !Array.isArray(t.lines)) err(`${name} L${t.l}: esquema inválido`);
    t.lines.forEach((ln, li) => {
      const where = `${name} L${t.l}#${li + 1}`;
      if (!ln.es || !ln.en) err(`${where}: falta traducción`);
      checkLine(ln.zh, where);
    });
  });
}
GRAMMAR.forEach(g => {
  if (!g.id || !g.title || !g.desc || !Array.isArray(g.examples)) err(`GRAMMAR ${g.id || '?'}: esquema inválido`);
  (g.examples || []).forEach((ex, i) => checkLine(ex.zh, `GRAMMAR ${g.id}#${i + 1}`));
});
for (const [ch, wheres] of missing)
  err(`carácter sin entrada de diccionario: ${ch} (${wheres.join('; ')})`);

// ---------- service worker: lista de assets ----------
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const m = sw.match(/ASSETS\s*=\s*\[([\s\S]*?)\]/);
if (!m) err('sw.js: no se encontró la lista ASSETS');
else {
  const listed = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]).filter(a => !a.startsWith('http') && a !== '.');
  for (const a of listed) if (!existsSync(join(ROOT, a))) err(`sw.js ASSETS: '${a}' no existe en disco`);
  const onDisk = [];
  for (const dir of ['js', 'data', 'css', 'js/views', 'js/views/practice']) {
    const full = join(ROOT, dir);
    if (!existsSync(full)) continue;
    for (const f of readdirSync(full)) if (f.endsWith('.js') || f.endsWith('.css')) {
      const rel = `${dir}/${f}`;
      if (!onDisk.includes(rel)) onDisk.push(rel);
    }
  }
  for (const f of onDisk) if (!listed.includes(f)) err(`sw.js ASSETS: falta '${f}'`);
}

// ---------- informe ----------
console.log(`Entradas de vocabulario: ${ALL.length}`);
if (warnings.length) { console.log(`\n⚠️  ${warnings.length} avisos:`); warnings.forEach(w => console.log('  - ' + w)); }
if (errors.length) {
  console.error(`\n❌ ${errors.length} errores:`);
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('✅ datos válidos');
