// practice/corpus.js — utilidades compartidas por los juegos
import { B1_TEXTS, B2_TEXTS, B1_READINGS, B2_READINGS } from '../../../data/index.js';
import { settings } from '../../store.js';
import { segment } from '../../dict.js';

// Todas las líneas de diálogos + lecturas hasta maxLesson: {zh, es, en, lesson}
export function corpusLines() {
  const out = [];
  const max = settings.maxLesson;
  for (const texts of [B1_TEXTS, B2_TEXTS])
    texts.forEach(t => { if (t.l <= max) t.parts.forEach(p => p.lines.forEach(ln => out.push({ ...ln, lesson: t.l }))); });
  for (const reads of [B1_READINGS, B2_READINGS])
    reads.forEach(t => { if (t.l <= max) t.lines.forEach(ln => out.push({ ...ln, lesson: t.l })); });
  return out;
}

// Tokens de palabra (no puntuación) de una línea, con la entrada de diccionario
export function wordTokens(zh) {
  return segment(zh).filter(t => !t.plain).map(t => ({ h: t.t, e: t.entries[0] }));
}

export function sample(arr, n) {
  const c = arr.slice();
  for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  return c.slice(0, n);
}
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
