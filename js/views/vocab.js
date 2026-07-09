// views/vocab.js — explorador de vocabulario con búsqueda y concordancia
import { ALL } from '../dict.js';
import { settings } from '../store.js';
import { T, gloss } from '../i18n.js';
import { speak } from '../audio.js';
import { $, setView, popupEntry, renderTokens } from '../ui.js';
import { register } from '../router.js';
import { search as textSearch } from '../concordance.js';

export function renderVocab() {
  const v = setView(`
    <input id="vsearch" class="search" placeholder="${T('search')}">
    <div id="vfilter" class="scroll-row"></div>
    <div id="vlist" class="vlist"></div>
    <div id="vtext"></div>`);
  let activeFilter = 'all';
  const grid = $('#vfilter');
  const filters = ['all', 'hsk1', 'hsk2', 'hsk3', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  filters.forEach(f => {
    const b = document.createElement('button');
    b.className = 'lesson-btn' + (f === 'all' ? ' on' : '');
    b.style.display = 'inline-block';
    if (f === 'all') b.innerHTML = `<b>${T('all')}</b>`;
    else if (typeof f === 'string') b.innerHTML = `<b>${f.toUpperCase()}</b>`;
    else b.innerHTML = `<b>L${f === 0 ? '✦' : f}</b>`;
    b.addEventListener('click', () => {
      activeFilter = f;
      grid.querySelectorAll('.lesson-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); draw();
    });
    grid.appendChild(b);
  });
  $('#vsearch').addEventListener('input', draw);

  function draw() {
    const q = $('#vsearch').value.trim().toLowerCase();
    const list = $('#vlist'); list.innerHTML = '';
    let items = ALL.filter(e => {
      if (activeFilter === 'all') return true;
      if (typeof activeFilter === 'string') return e.tags && e.tags.includes(activeFilter);
      return e.l === activeFilter;
    });
    if (q) items = items.filter(e => e.h.includes(q) || e.p.toLowerCase().includes(q)
      || (e.es && e.es.toLowerCase().includes(q)) || (e.en && e.en.toLowerCase().includes(q)));
    items.slice(0, 400).forEach(e => {
      const d = document.createElement('div');
      d.className = 'vrow' + (e.sup ? ' sup' : '');
      d.innerHTML = `<span class="vh">${e.h}</span><span class="vp">${e.p}</span>
        <span class="vg">${gloss(e)}</span><span class="vl">${e.l === 0 ? '✦' : e.l}</span>`;
      d.addEventListener('click', () => popupEntry(e.h));
      list.appendChild(d);
    });
    // concordancia: si la búsqueda es hanzi, mostrar líneas de los textos
    const vt = $('#vtext'); vt.innerHTML = '';
    if (q && /[㐀-鿿]/.test(q)) {
      const lines = textSearch(q, 20);
      if (lines.length) {
        const h = document.createElement('h3'); h.textContent = `${T('inTexts')} (${lines.length})`; vt.appendChild(h);
        lines.forEach(ln => {
          const row = document.createElement('div'); row.className = 'use-line';
          const zh = document.createElement('div'); zh.className = 'use-zh';
          zh.appendChild(renderTokens(ln.zh, 'none'));
          const spk = document.createElement('button'); spk.className = 'spk-btn'; spk.textContent = '🔊';
          spk.addEventListener('click', () => speak(ln.zh));
          zh.appendChild(spk);
          const tr = document.createElement('div'); tr.className = 'use-tr'; tr.textContent = settings.lang === 'en' ? ln.en : ln.es;
          row.appendChild(zh); row.appendChild(tr); vt.appendChild(row);
        });
      }
    }
  }
  draw();
}

register('vocab', renderVocab);
