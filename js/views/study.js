// views/study.js — pantalla principal: estadísticas, panel de progreso, cram y práctica
import { ALL } from '../dict.js';
import { settings } from '../store.js';
import * as SRS from '../srs.js';
import { T } from '../i18n.js';
import { $, setView, cardPool } from '../ui.js';
import { register } from '../router.js';
import { startSRS, startCram } from './cards.js';
import { renderCloze } from './practice/cloze.js';
import { renderBuilder } from './practice/builder.js';
import { renderPairs } from './practice/pairs.js';
import { renderTones } from './practice/tones.js';
import { renderNumbers } from './practice/numbers.js';

function streakOf() {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (settings.history[ds]) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function heatmapHTML() {
  const today = new Date();
  let h = '<div class="heatmap">';
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const count = settings.history[ds] || 0;
    const lvl = count === 0 ? 0 : count < 20 ? 1 : count < 50 ? 2 : 3;
    h += `<div class="heat-box lvl-${lvl}" title="${ds}: ${count}"></div>`;
  }
  return h + '</div>';
}

function bar(learned, mature, total) {
  const lp = total ? Math.round(100 * learned / total) : 0;
  const mp = total ? Math.round(100 * mature / total) : 0;
  return `<div class="pbar"><div class="pbar-learned" style="width:${lp}%"></div><div class="pbar-mature" style="width:${mp}%"></div></div>`;
}

function dashboardHTML() {
  const pool = cardPool(ALL);
  const st = SRS.stats(pool);
  let h = `<details class="dash"><summary>${T('progress')} — ${st.learned} ${T('known')} · ${st.mature} ${T('mature')}</summary>`;
  // por lección
  h += `<h4>${T('byLesson')}</h4><div class="prog-list">`;
  for (let l = 0; l <= 20; l++) {
    const cards = ALL.filter(e => e.l === l && (settings.includeSup || !e.sup));
    if (!cards.length) continue;
    const s = SRS.stats(cards);
    h += `<div class="prog-row"><span class="prog-lbl">${l === 0 ? '✦' : l}</span>${bar(s.learned, s.mature, s.total)}<span class="prog-num">${s.learned}/${s.total}</span></div>`;
  }
  h += '</div>';
  // por HSK
  h += `<h4>${T('byHsk')}</h4><div class="prog-list">`;
  for (const tag of ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5']) {
    const cards = ALL.filter(e => e.tags && e.tags.includes(tag) && (settings.includeSup || !e.sup));
    if (!cards.length) continue;
    const s = SRS.stats(cards);
    h += `<div class="prog-row"><span class="prog-lbl">${tag.toUpperCase()}</span>${bar(s.learned, s.mature, s.total)}<span class="prog-num">${s.learned}/${s.total}</span></div>`;
  }
  h += '</div>';
  // pronóstico
  const fc = SRS.forecast(pool, 7);
  const maxfc = Math.max(1, ...fc);
  h += `<h4>${T('forecast')}</h4><div class="forecast">` +
    fc.map(n => `<div class="fc-col"><div class="fc-bar" style="height:${Math.round(40 * n / maxfc) + 2}px"></div><span>${n}</span></div>`).join('') +
    '</div>';
  return h + '</details>';
}

const GAMES = [
  ['hardWords', 'hardWordsDesc', '🎯', () => { const l = SRS.leeches(cardPool(ALL)); if (l.length) startCram(l); else alert(T('noDue')); }],
  ['cloze', 'clozeDesc', '✏️', renderCloze],
  ['builder', 'builderDesc', '🧩', renderBuilder],
  ['pairs', 'pairsDesc', '🔗', renderPairs],
  ['toneGame', 'toneGameDesc', '🎵', renderTones],
  ['numbers', 'numbersDesc', '🔢', renderNumbers]
];

export function renderStudy() {
  const pool = cardPool(ALL);
  const st = SRS.stats(pool);
  const v = setView(`
    <div class="stats">
      <div class="stat"><b>${st.due}</b><span>${T('due')}</span></div>
      <div class="stat"><b>${st.fresh}</b><span>${T('fresh')}</span></div>
      <div class="stat"><b>${streakOf()}</b><span>${T('streak')} 🔥</span></div>
    </div>
    ${heatmapHTML()}
    ${dashboardHTML()}
    <button id="start-srs" class="big-btn">${T('start')}</button>
    <h3>${T('practice')}</h3>
    <div id="games" class="game-grid"></div>
    <h3>${T('cram')}</h3>
    <div id="cram-container"></div>`);
  $('#start-srs').addEventListener('click', startSRS);

  const gg = $('#games');
  GAMES.forEach(([name, desc, icon, fn]) => {
    const b = document.createElement('button');
    b.className = 'game-card';
    b.innerHTML = `<span class="game-icon">${icon}</span><b>${T(name)}</b><span class="game-desc">${T(desc)}</span>`;
    b.addEventListener('click', fn);
    gg.appendChild(b);
  });

  const container = $('#cram-container');
  container.innerHTML = `<h4>HSK</h4><div id="cram-hsk" class="lesson-grid" style="margin-bottom:20px;"></div>
    <h4>${T('book1')} (1-10)</h4><div id="cram-b1" class="lesson-grid"></div>
    <h4>${T('book2')} (11-20)</h4><div id="cram-b2" class="lesson-grid"></div>`;
  ['hsk1', 'hsk2', 'hsk3'].forEach(tag => {
    const cards = ALL.filter(e => e.tags && e.tags.includes(tag) && (settings.includeSup || !e.sup));
    if (!cards.length) return;
    const b = document.createElement('button'); b.className = 'lesson-btn';
    b.innerHTML = `<b>${tag.toUpperCase()}</b><span>${cards.length}</span>`;
    b.addEventListener('click', () => startCram(cards));
    $('#cram-hsk').appendChild(b);
  });
  for (let l = 0; l <= 20; l++) {
    const cards = ALL.filter(e => e.l === l && (settings.includeSup || !e.sup));
    if (!cards.length) continue;
    const b = document.createElement('button'); b.className = 'lesson-btn';
    b.innerHTML = `<b>${l === 0 ? '✦' : l}</b><span>${cards.length}</span>`;
    b.addEventListener('click', () => startCram(cards));
    (l <= 10 ? $('#cram-b1') : $('#cram-b2')).appendChild(b);
  }
}

register('study', renderStudy);
