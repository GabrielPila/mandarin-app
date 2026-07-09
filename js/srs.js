// srs.js — planificador tipo SM-2 (solo lógica de agendado)
import { getCard, putCard, getState, recordActivity } from './store.js';

const DAY = 24 * 60 * 60 * 1000;

export function get(id) { return getCard(id); }

// grade: 0=otra vez, 3=difícil, 4=bien, 5=fácil
export function review(id, grade) {
  const now = Date.now();
  let c = getCard(id) || { ef: 2.5, ivl: 0, reps: 0, due: now, lapses: 0 };
  if (grade < 3) {
    if (c.reps > 0) c.lapses = (c.lapses || 0) + 1; // recaída tras haberla sabido
    c.reps = 0; c.ivl = 0;
    c.due = now + 10 * 60 * 1000; // 10 min
  } else {
    if (c.reps === 0) c.ivl = 1;
    else if (c.reps === 1) c.ivl = grade === 5 ? 4 : 3;
    else c.ivl = Math.round(c.ivl * c.ef);
    if (grade === 3) c.ivl = Math.max(1, Math.round(c.ivl * 0.8));
    c.ef = Math.max(1.3, c.ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
    c.reps += 1;
    c.due = now + c.ivl * DAY;
  }
  c.last = now;
  putCard(id, c);
  recordActivity();
}

export function dueCards(pool) {
  const now = Date.now();
  return pool.filter(e => { const c = getCard(e.id); return c && c.due <= now; });
}
export function newCards(pool) {
  return pool.filter(e => !getCard(e.id));
}
export function stats(pool) {
  const now = Date.now();
  let learned = 0, due = 0, mature = 0;
  for (const e of pool) {
    const c = getCard(e.id);
    if (c) { learned++; if (c.due <= now) due++; if (c.ivl >= 21) mature++; }
  }
  return { total: pool.length, learned, due, mature, fresh: pool.length - learned };
}

// Cartas conflictivas (leeches): muchas recaídas o EF muy bajo
export function leeches(pool, limit = 40) {
  const scored = [];
  for (const e of pool) {
    const c = getCard(e.id);
    if (!c) continue;
    const score = (c.lapses || 0) * 2 + Math.max(0, 2.5 - (c.ef || 2.5)) * 3;
    if (score > 0) scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.e);
}

// Pronóstico de repasos para los próximos 7 días
export function forecast(pool, days = 7) {
  const now = Date.now();
  const out = new Array(days).fill(0);
  for (const e of pool) {
    const c = getCard(e.id);
    if (!c) continue;
    const d = Math.floor((c.due - now) / DAY);
    if (d >= 0 && d < days) out[d]++;
  }
  return out;
}

export { getState };
