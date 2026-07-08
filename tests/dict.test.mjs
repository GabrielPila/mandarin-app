import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segment, syllables, toneOf, isHan, DICT } from '../js/dict.js';

test('segment: longest match wins', () => {
  const toks = segment('图书馆在食堂北边');
  assert.deepEqual(toks.map(t => t.t), ['图书馆', '在', '食堂', '北边']);
  assert.ok(toks.every(t => !t.plain));
});

test('segment: punctuation and digits pass through as plain tokens', () => {
  const toks = segment('现在是403号!');
  const plain = toks.filter(t => t.plain).map(t => t.t);
  assert.ok(plain.includes('403'));
  assert.ok(plain.includes('!'));
});

test('segment: mixed han/latin groups non-han runs', () => {
  const toks = segment('我坐G14次');
  assert.deepEqual(toks.map(t => t.t), ['我', '坐', 'G14', '次']);
});

test('syllables: one syllable per character', () => {
  assert.deepEqual(syllables({ h: '图书馆', p: 'tú shū guǎn' }), ['tú', 'shū', 'guǎn']);
});

test('syllables: erhua gets empty ruby on 儿', () => {
  assert.deepEqual(syllables({ h: '面条儿', p: 'miàn tiáor' }), ['miàn', 'tiáor', '']);
  assert.deepEqual(syllables({ h: '一会儿', p: 'yí huìr' }), ['yí', 'huìr', '']);
});

test('syllables: apostrophe and hyphen separate syllables', () => {
  assert.deepEqual(syllables({ h: '西安', p: "Xī 'ān" }), ['Xī', 'ān']);
  assert.deepEqual(syllables({ h: '第一次', p: 'dì-yī cì' }), ['dì', 'yī', 'cì']);
});

test('toneOf: detects all five tones', () => {
  assert.equal(toneOf('mā'), 1);
  assert.equal(toneOf('má'), 2);
  assert.equal(toneOf('mǎ'), 3);
  assert.equal(toneOf('mà'), 4);
  assert.equal(toneOf('ma'), 0);
});

test('isHan', () => {
  assert.ok(isHan('中'));
  assert.ok(!isHan('a'));
  assert.ok(!isHan('。'));
});

test('dictionary covers core starters', () => {
  for (const w of ['你好', '谢谢', '中国', '学习']) {
    assert.ok(DICT.has(w) || DICT.has(w[0]), `falta ${w}`);
  }
});
