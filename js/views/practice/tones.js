// practice/tones.js — identifica el patrón de tonos que oyes
import { ALL, syllables, toneOf, TONE_MARK } from '../../dict.js';
import { settings, recordActivity } from '../../store.js';
import { T } from '../../i18n.js';
import { speak } from '../../audio.js';
import { $, setView } from '../../ui.js';
import { nav } from '../../router.js';
import { sample, pick } from './corpus.js';

const ROUND = 10;
const TONE_GLYPH = ['˙', 'ˉ', 'ˊ', 'ˇ', 'ˋ']; // 0..4

function patternOf(e) {
  return syllables(e).map(s => s ? toneOf(s) : 0);
}
function patternLabel(pat) {
  return pat.map(t => TONE_GLYPH[t]).join(' ');
}

export function renderTones() {
  // palabras de 1-2 sílabas hasta maxLesson, sin tono neutro dominante
  const words = ALL.filter(e => {
    if (e.l > settings.maxLesson) return false;
    const pat = patternOf(e);
    return pat.length >= 1 && pat.length <= 2 && pat.some(t => t > 0);
  });
  if (!words.length) { setView(`<p class="empty">${T('noDue')}</p>`); return; }
  let n = 0, correct = 0;

  function round() {
    if (n >= ROUND) {
      recordActivity();
      setView(`<div class="summary"><h2>${T('toneGame')}</h2>
        <div class="stats"><div class="stat"><b>${correct}/${ROUND}</b><span>${T('score')}</span></div></div>
        <button id="again" class="big-btn">${T('restart')}</button>
        <button id="back" class="big-btn secondary">${T('back')}</button></div>`);
      $('#again').addEventListener('click', renderTones);
      $('#back').addEventListener('click', () => nav('study'));
      return;
    }
    const e = pick(words);
    const pat = patternOf(e);
    // opciones: patrón real + 3 permutaciones distintas
    const opts = new Set([pat.join('')]);
    let guard = 0;
    while (opts.size < 4 && guard++ < 40) {
      const alt = pat.map(() => Math.floor(Math.random() * 5));
      if (alt.some(t => t > 0)) opts.add(alt.join(''));
    }
    const optionList = sample([...opts].map(s => s.split('').map(Number)), opts.size);

    const v = setView(`
      <div class="card-progress">${n + 1} ${T('of')} ${ROUND}</div>
      <div class="tone-play"><button id="play" class="spk-btn large">🔊</button></div>
      <div id="opts" class="cloze-opts"></div>
      <button id="back" class="back-btn">← ${T('back')}</button>`);
    setTimeout(() => speak(e.h), 250);
    $('#play').addEventListener('click', () => speak(e.h));
    const optsEl = $('#opts');
    optionList.forEach(o => {
      const b = document.createElement('button'); b.className = 'cloze-opt tone-opt'; b.textContent = patternLabel(o);
      b.addEventListener('click', () => {
        const ok = o.join('') === pat.join('');
        if (ok) correct++;
        optsEl.querySelectorAll('button').forEach(x => {
          x.disabled = true;
          if (x.textContent === patternLabel(pat)) x.classList.add('opt-correct');
          else if (x === b) x.classList.add('opt-wrong');
        });
        const rev = document.createElement('div'); rev.className = 'tone-reveal';
        rev.textContent = `${e.h}  ${e.p}`;
        optsEl.appendChild(rev);
        const nx = document.createElement('button'); nx.className = 'big-btn'; nx.textContent = T('next');
        nx.addEventListener('click', () => { n++; round(); });
        optsEl.appendChild(nx);
      });
      optsEl.appendChild(b);
    });
    $('#back').addEventListener('click', () => nav('study'));
  }
  round();
}
