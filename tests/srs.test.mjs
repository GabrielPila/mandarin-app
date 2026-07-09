import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// stub de localStorage antes de importar los módulos que lo usan
const mem = {};
globalThis.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; }
};

let srs;
before(async () => { srs = await import('../js/srs.js'); });

test('grade 0 resets reps and schedules ~10 min', () => {
  const before = Date.now();
  srs.review('t1', 4);          // primera vez bien → 1 día
  srs.review('t1', 0);          // recaída
  const c = srs.get('t1');
  assert.equal(c.reps, 0);
  assert.equal(c.lapses, 1);
  assert.ok(c.due - before < 60 * 60 * 1000); // menos de 1h
});

test('first good = 1 day, second good grows', () => {
  srs.review('t2', 4);
  assert.equal(srs.get('t2').ivl, 1);
  srs.review('t2', 4);
  assert.equal(srs.get('t2').ivl, 3);
});

test('easy on second review = 4 days', () => {
  srs.review('t3', 4);
  srs.review('t3', 5);
  assert.equal(srs.get('t3').ivl, 4);
});

test('EF floor is 1.3', () => {
  for (let i = 0; i < 10; i++) srs.review('t4', 3);
  assert.ok(srs.get('t4').ef >= 1.3);
});

test('lapses only increment after a success', () => {
  srs.review('t5', 0); // primera vez, aún sin reps → sin lapse
  assert.equal(srs.get('t5').lapses, 0);
  srs.review('t5', 4);
  srs.review('t5', 0);
  assert.equal(srs.get('t5').lapses, 1);
});

test('stats and dueCards', () => {
  const pool = [{ id: 't2' }, { id: 'never' }];
  const st = srs.stats(pool);
  assert.equal(st.total, 2);
  assert.equal(st.learned, 1);
  assert.equal(st.fresh, 1);
});
