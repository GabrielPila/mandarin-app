// practice/builder.js — ordena las palabras para reconstruir la frase
import { T } from '../../i18n.js';
import { settings } from '../../store.js';
import { speak } from '../../audio.js';
import { recordActivity } from '../../store.js';
import { $, setView, renderTokens } from '../../ui.js';
import { nav } from '../../router.js';
import { corpusLines, wordTokens, sample, pick } from './corpus.js';

const ROUND = 8;

export function renderBuilder() {
  const lines = corpusLines().filter(l => {
    const n = wordTokens(l.zh).length;
    return n >= 4 && n <= 12;
  });
  if (!lines.length) { setView(`<p class="empty">${T('noDue')}</p>`); return; }
  let n = 0, correct = 0;

  function round() {
    if (n >= ROUND) {
      setView(`<div class="summary"><h2>${T('builder')}</h2>
        <div class="stats"><div class="stat"><b>${correct}/${ROUND}</b><span>${T('score')}</span></div></div>
        <button id="again" class="big-btn">${T('restart')}</button>
        <button id="back" class="big-btn secondary">${T('back')}</button></div>`);
      $('#again').addEventListener('click', renderBuilder);
      $('#back').addEventListener('click', () => nav('study'));
      return;
    }
    const line = pick(lines);
    const words = wordTokens(line.zh).map(t => t.h);
    let scrambled = sample(words, words.length);
    if (scrambled.join('') === words.join('')) scrambled = sample(words, words.length);

    const v = setView(`
      <div class="card-progress">${n + 1} ${T('of')} ${ROUND}</div>
      <div class="builder-hint">${settings.lang === 'en' ? line.en : line.es}</div>
      <div id="answer" class="builder-answer"></div>
      <div id="bank" class="builder-bank"></div>
      <button id="check" class="big-btn" disabled>${T('check')}</button>
      <button id="back" class="back-btn">← ${T('back')}</button>`);
    const answer = $('#answer'), bank = $('#bank');
    const picked = [];

    function refresh() {
      $('#check').disabled = picked.length !== words.length;
    }
    scrambled.forEach((w, i) => {
      const t = document.createElement('button');
      t.className = 'tile'; t.textContent = w; t.dataset.i = i;
      t.addEventListener('click', () => {
        if (t.classList.contains('used')) return;
        t.classList.add('used');
        const at = document.createElement('button');
        at.className = 'tile'; at.textContent = w;
        at.addEventListener('click', () => { at.remove(); t.classList.remove('used'); picked.splice(picked.indexOf(at), 1); refresh(); });
        answer.appendChild(at); picked.push(at); refresh();
      });
      bank.appendChild(t);
    });
    $('#check').addEventListener('click', () => {
      const got = picked.map(x => x.textContent).join('');
      const ok = got === words.join('');
      if (ok) correct++;
      answer.classList.add(ok ? 'ok' : 'bad');
      recordActivity();
      const res = document.createElement('div'); res.className = 'builder-result';
      res.appendChild(renderTokens(line.zh, 'pinyin'));
      const tr = document.createElement('div'); tr.className = 'pop-ex-tr'; tr.textContent = settings.lang === 'en' ? line.en : line.es;
      res.appendChild(tr);
      v.appendChild(res);
      speak(line.zh, null, line.s);
      $('#check').textContent = T('next'); $('#check').disabled = false;
      $('#check').replaceWith($('#check').cloneNode(true));
      $('#check').addEventListener('click', () => { n++; round(); });
    });
    $('#back').addEventListener('click', () => nav('study'));
  }
  round();
}
