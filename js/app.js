// app.js — interfaz
(function(){
'use strict';
const $ = sel => document.querySelector(sel);
const S = window.SRS, C = window.Core;

const UI = {
  es: {study:'Estudiar', texts:'Textos', vocab:'Vocabulario', grammar:'Gramática', settings:'Ajustes',
    due:'para repasar', fresh:'nuevas', learned:'aprendidas', start:'Repasar ahora',
    cram:'Repaso libre por lección', lesson:'Lección', show:'Mostrar', again:'Otra vez',
    hard:'Difícil', good:'Bien', easy:'Fácil', done:'¡Has terminado por ahora!',
    dialogs:'Diálogos del libro', readings:'Lecturas nuevas', pinyin:'Pinyin',
    tones:'Tonos', trans:'Traducción', example:'Ejemplo', search:'Buscar…',
    lang:'Idioma de los significados', includeSup:'Incluir palabras suplementarias en las tarjetas',
    newPerDay:'Tarjetas nuevas por sesión', maxLesson:'Estudiar hasta la lección',
    exportBtn:'Exportar progreso', importBtn:'Importar progreso', resetBtn:'Borrar todo el progreso',
    resetConfirm:'¿Seguro? Esto borra todo tu progreso de repaso.', imported:'Progreso importado ✓',
    noDue:'No hay tarjetas pendientes. ¡Vuelve más tarde o repasa una lección!',
    cardsLeft:'tarjetas', supTag:'suplementaria', of:'de', back:'Volver', all:'Todas', streak:'Racha', days:'días',
    text1:'Texto', flipHint:'Toca la tarjeta para ver la respuesta',
    textSize: 'Tamaño del texto', theme: 'Tema', light: 'Claro', dark: 'Oscuro', system: 'Sistema', book1: 'Libro 1', book2: 'Libro 2', sizeSmall: 'Pequeño', sizeMedium: 'Mediano', sizeLarge: 'Grande',
    voiceSpeed: 'Velocidad de voz', voice: 'Voz preferida', testVoice: '🔊 Probar', autoVoice: 'Automático (Recomendado)'},
  en: {study:'Study', texts:'Texts', vocab:'Vocabulary', grammar:'Grammar', settings:'Settings',
    due:'to review', fresh:'new', learned:'learned', start:'Review now',
    cram:'Free review by lesson', lesson:'Lesson', show:'Show', again:'Again',
    hard:'Hard', good:'Good', easy:'Easy', done:'You are done for now!',
    dialogs:'Book dialogues', readings:'New readings', pinyin:'Pinyin',
    tones:'Tones', trans:'Translation', example:'Example', search:'Search…',
    lang:'Language for meanings', includeSup:'Include supplementary words in flashcards',
    newPerDay:'New cards per session', maxLesson:'Study up to lesson',
    exportBtn:'Export progress', importBtn:'Import progress', resetBtn:'Reset all progress',
    resetConfirm:'Are you sure? This deletes all review progress.', imported:'Progress imported ✓',
    noDue:'No cards due. Come back later or cram a lesson!',
    cardsLeft:'cards', supTag:'supplementary', of:'of', back:'Back', all:'All', streak:'Streak', days:'days',
    text1:'Text', flipHint:'Tap the card to reveal the answer',
    textSize: 'Text size', theme: 'Theme', light: 'Light', dark: 'Dark', system: 'System', book1: 'Book 1', book2: 'Book 2', sizeSmall: 'Small', sizeMedium: 'Medium', sizeLarge: 'Large',
    voiceSpeed: 'Voice speed', voice: 'Preferred voice', testVoice: '🔊 Test', autoVoice: 'Auto (Recommended)'}
};
function T(k){ return UI[S.settings.lang][k] || k; }
function gloss(e){ return S.settings.lang === 'en' ? e.en : e.es; }
function exGloss(ex){ return S.settings.lang === 'en' ? ex[2] : ex[1]; }

// ---------- pool de tarjetas ----------
function cardPool(){
  return C.ALL.filter(e => e.l <= S.settings.maxLesson && (S.settings.includeSup || !e.sup));
}

// ---------- render de palabras chinas ----------
// mode: 'none' | 'pinyin' | 'tones'
function renderTokens(zh, mode){
  const frag = document.createDocumentFragment();
  for(const tok of C.segment(zh)){
    if(tok.plain){
      const sp = document.createElement('span');
      sp.className = 'plain';
      const ruby = document.createElement('span');
      ruby.className = 'ruby';
      ruby.innerHTML = '&nbsp;';
      ruby.style.visibility = 'hidden';
      if(mode === 'none') ruby.style.display = 'none';
      const base = document.createElement('span');
      base.className = 'base'; base.textContent = tok.t;
      sp.appendChild(ruby); sp.appendChild(base);
      frag.appendChild(sp);
      continue;
    }
    const e = tok.entries[0];
    const syls = C.syllables(e);
    const w = document.createElement('span');
    w.className = 'w'; w.dataset.h = tok.t;
    Array.from(tok.t).forEach((ch,i)=>{
      const cs = document.createElement('span');
      cs.className = 'ch';
      const ruby = document.createElement('span');
      ruby.className = 'ruby';
      if(mode === 'pinyin') ruby.textContent = syls[i] || ' ';
      else if(mode === 'tones') {
        ruby.textContent = syls[i] ? C.TONE_MARK[C.toneOf(syls[i])] : ' ';
        ruby.classList.add('tones-only');
      }
      else ruby.textContent = '';
      if(mode === 'none') ruby.style.display = 'none';
      const base = document.createElement('span');
      base.className = 'base'; base.textContent = ch;
      cs.appendChild(ruby); cs.appendChild(base);
      w.appendChild(cs);
    });
    w.addEventListener('click', ev => { ev.stopPropagation(); showPopup(tok); });
    frag.appendChild(w);
  }
  return frag;
}

// ---------- popup de palabra ----------
function showPopup(tok){
  const pop = $('#popup'), body = $('#popup-body');
  body.innerHTML = '';
  tok.entries.forEach((e, idx) => {
    const div = document.createElement('div');
    div.className = 'pop-entry';
    div.innerHTML = `<div class="pop-head"><span class="pop-h">${e.h}</span>
      <button class="spk-btn" onclick="Core.speak('${e.h}')">🔊</button>
      <span class="pop-p">${e.p}</span></div>
      <div id="hw-cont-${idx}" class="hw-container"></div>
      <div class="pop-meta">${e.pos ? e.pos+' · ' : ''}${T('lesson')} ${e.l}${e.sup ? ' · '+T('supTag') : ''}</div>
      <div class="pop-g">${gloss(e)}</div>`;
    if(e.ex){
      const exd = document.createElement('div');
      exd.className = 'pop-ex';
      exd.innerHTML = `<div class="pop-ex-label">${T('example')}</div>`;
      const zh = document.createElement('div'); zh.className='pop-ex-zh';
      zh.appendChild(renderTokens(e.ex[0], 'none'));
      const tr = document.createElement('div'); tr.className='pop-ex-tr'; tr.textContent = exGloss(e.ex);
      exd.appendChild(zh); exd.appendChild(tr);
      div.appendChild(exd);
    }
    body.appendChild(div);
    if(window.HanziWriter){
      const hwCont = div.querySelector('#hw-cont-'+idx);
      for(const ch of e.h){
        if(!C.isHan(ch)) continue;
        const box = document.createElement('div');
        box.className = 'hw-box';
        hwCont.appendChild(box);
        const writer = HanziWriter.create(box, ch, {
          width: 50, height: 50, padding: 2,
          strokeColor: document.body.classList.contains('theme-dark') ? '#e53935' : '#d32f2f',
          delayBetweenStrokes: 100, strokeAnimationSpeed: 1.5
        });
        box.addEventListener('click', () => writer.animateCharacter());
      }
    }
  });
  pop.classList.add('open');
}
document.addEventListener('click', e => {
  if(e.target.id === 'popup') $('#popup').classList.remove('open');
});
$('#popup-close').addEventListener('click', ()=> $('#popup').classList.remove('open'));

// ---------- Tracing Quiz ----------
window.startQuiz = function(word){
  const modal = $('#quiz-modal'), hwCont = $('#quiz-hw'), status = $('.quiz-status');
  modal.classList.remove('hidden');
  hwCont.innerHTML = '';
  status.textContent = 'Traza el carácter (' + word + ')';
  
  const chars = Array.from(word).filter(c => Core.isHan(c));
  if(!chars.length) return;
  
  let currentIdx = 0;
  
  function renderChar(idx){
    hwCont.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'hw-quiz-box';
    hwCont.appendChild(box);
    const writer = HanziWriter.create(box, chars[idx], {
      width: 250, height: 250, padding: 10,
      showOutline: true, strokeAnimationSpeed: 2, delayBetweenStrokes: 50,
      strokeColor: document.body.classList.contains('theme-dark') ? '#e53935' : '#d32f2f'
    });
    writer.quiz({
      onComplete: () => {
        if(idx + 1 < chars.length){
          status.textContent = '¡Bien! Siguiente...';
          setTimeout(() => renderChar(idx + 1), 800);
        } else {
          status.textContent = '¡Excelente! Terminado 🎉';
          setTimeout(() => modal.classList.add('hidden'), 1500);
        }
      }
    });
  }
  renderChar(0);
};
$('#quiz-close').addEventListener('click', () => $('#quiz-modal').classList.add('hidden'));

// ---------- navegación ----------
const tabs = ['study','texts','vocab','grammar','settings'];
let current = 'study';
function nav(tab){
  current = tab;
  tabs.forEach(t => $('#tab-'+t).classList.toggle('active', t===tab));
  ({study:renderStudy, texts:renderTextList, vocab:renderVocab, grammar:renderGrammar, settings:renderSettings})[tab]();
}
tabs.forEach(t => $('#tab-'+t).addEventListener('click', ()=>nav(t)));

function setView(html){ const v = $('#view'); v.innerHTML = html; v.scrollTop = 0; return v; }

// ---------- ESTUDIAR ----------
function renderStudy(){
  const pool = cardPool();
  const st = S.stats(pool);
  
  const today = new Date();
  let streak = 0;
  for(let i=0; i<365; i++){
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0,10);
    if(S.settings.history && S.settings.history[ds]) streak++;
    else if(i > 0) break;
  }
  
  let heatmapHTML = '<div class="heatmap">';
  for(let i=13; i>=0; i--){
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0,10);
    const count = (S.settings.history && S.settings.history[ds]) || 0;
    const intensity = count === 0 ? 0 : count < 20 ? 1 : count < 50 ? 2 : 3;
    heatmapHTML += `<div class="heat-box lvl-${intensity}" title="${ds}: ${count}"></div>`;
  }
  heatmapHTML += '</div>';

  const v = setView(`
    <div class="stats">
      <div class="stat"><b>${st.due}</b><span>${T('due')}</span></div>
      <div class="stat"><b>${st.fresh}</b><span>${T('fresh')}</span></div>
      <div class="stat"><b>${streak}</b><span>${T('streak')} 🔥</span></div>
    </div>
    ${heatmapHTML}
    <button id="start-srs" class="big-btn">${T('start')}</button>
    <h3>${T('cram')}</h3>
    <div id="cram-container"></div>`);
  $('#start-srs').addEventListener('click', startSRS);
  const container = $('#cram-container');
  container.innerHTML = `<h4>HSK</h4><div id="cram-hsk" class="lesson-grid" style="margin-bottom: 20px;"></div>
                         <h4>${T('book1')} (1-10)</h4><div id="cram-b1" class="lesson-grid"></div>
                         <h4>${T('book2')} (11-20)</h4><div id="cram-b2" class="lesson-grid"></div>`;
                         
  ['hsk1', 'hsk2', 'hsk3'].forEach(tag => {
    const cards = C.ALL.filter(e => e.tags && e.tags.includes(tag) && (S.settings.includeSup || !e.sup));
    if(!cards.length) return;
    const b = document.createElement('button');
    b.className = 'lesson-btn';
    b.innerHTML = `<b>${tag.toUpperCase()}</b><span>${cards.length}</span>`;
    b.addEventListener('click', ()=> startCram(cards));
    $('#cram-hsk').appendChild(b);
  });
                         
  for(let l=0; l<=20; l++){
    const cards = C.ALL.filter(e => e.l===l && (S.settings.includeSup || !e.sup));
    if(!cards.length) continue;
    const b = document.createElement('button');
    b.className = 'lesson-btn';
    b.innerHTML = `<b>${l===0?'✦':l}</b><span>${cards.length}</span>`;
    b.addEventListener('click', ()=> startCram(cards));
    (l <= 10 ? $('#cram-b1') : $('#cram-b2')).appendChild(b);
  }
}

function startSRS(){
  const pool = cardPool();
  const due = S.dueCards(pool);
  const fresh = S.newCards(pool).slice(0, S.settings.newPerDay);
  const queue = shuffle(due.concat(fresh));
  if(!queue.length){ setView(`<p class="empty">${T('noDue')}</p>`); return; }
  runCards(queue, true);
}
function startCram(cards){ runCards(shuffle(cards.slice()), false); }

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function runCards(queue, srsMode){
  let idx = 0;
  function show(){
    if(idx >= queue.length){
      setView(`<p class="empty">${T('done')}</p><button class="big-btn" id="back-study">${T('back')}</button>`);
      $('#back-study').addEventListener('click', renderStudy);
      return;
    }
    const e = queue[idx];
    const v = setView(`
      <div class="card-progress">${idx+1} ${T('of')} ${queue.length}</div>
      <div id="card" class="card">
        <div class="card-h-row">
          <div class="card-h">${e.h}</div>
          <button class="spk-btn large" onclick="Core.speak('${e.h}'); event.stopPropagation();">🔊</button>
          <button class="spk-btn large" onclick="window.startQuiz('${e.h}'); event.stopPropagation();">✍️</button>
        </div>
        <div class="card-back hidden">
          <div class="card-p">${e.p}</div>
          <div class="card-pos">${e.pos||''}</div>
          <div class="card-g">${gloss(e)}</div>
          <div id="card-hw" class="hw-container center"></div>
          <div class="card-ex"></div>
        </div>
        <div class="flip-hint">${T('flipHint')}</div>
      </div>
      <div id="grade" class="grade hidden">
        ${srsMode
          ? `<button data-g="0" class="g-again">${T('again')}</button>
             <button data-g="3" class="g-hard">${T('hard')}</button>
             <button data-g="4" class="g-good">${T('good')}</button>
             <button data-g="5" class="g-easy">${T('easy')}</button>`
          : `<button data-g="0" class="g-again">${T('again')}</button>
             <button data-g="4" class="g-good">${T('good')}</button>`}
      </div>`);
    if(e.ex){
      const exd = v.querySelector('.card-ex');
      const zh = document.createElement('div'); zh.className='pop-ex-zh';
      zh.appendChild(renderTokens(e.ex[0],'none'));
      const tr = document.createElement('div'); tr.className='pop-ex-tr'; tr.textContent = exGloss(e.ex);
      exd.appendChild(zh); exd.appendChild(tr);
    }
    $('#card').addEventListener('click', ()=>{
      v.querySelector('.card-back').classList.remove('hidden');
      v.querySelector('.flip-hint').classList.add('hidden');
      $('#grade').classList.remove('hidden');
      
      const hwCont = v.querySelector('#card-hw');
      if(window.HanziWriter && hwCont.innerHTML===''){
        for(const ch of e.h){
          if(!C.isHan(ch)) continue;
          const box = document.createElement('div');
          box.className = 'hw-box';
          hwCont.appendChild(box);
          const writer = HanziWriter.create(box, ch, {
            width: 44, height: 44, padding: 2,
            strokeColor: document.body.classList.contains('theme-dark') ? '#e53935' : '#d32f2f'
          });
          setTimeout(() => writer.animateCharacter(), 200);
        }
      }
    });
    $('#grade').querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        const g = +b.dataset.g;
        if(srsMode) S.review(e.id, g);
        else S.recordActivity();
        if(g === 0) queue.push(e); // repetir al final
        idx++;
        show();
      });
    });
  }
  show();
}

// ---------- TEXTOS ----------
function renderTextList(){
  const v = setView(`<h3>${T('dialogs')}</h3><div id="list-d" class="text-list"></div>
    <h3>${T('readings')}</h3><div id="list-r" class="text-list"></div>`);
  const ld = $('#list-d'), lr = $('#list-r');
  const allTexts = window.B1_TEXTS.concat(window.B2_TEXTS || []);
  const allReadings = window.B1_READINGS.concat(window.B2_READINGS || []);
  allTexts.forEach((t,i)=>{
    const b = document.createElement('button');
    b.className = 'text-item';
    b.innerHTML = `<b>${T('lesson')} ${t.l}</b><span class="ti-zh">${t.t}</span>
      <span class="ti-tr">${S.settings.lang==='en'?t.ten:t.tes}</span>`;
    b.addEventListener('click', ()=> renderReader(t, 'dialog'));
    ld.appendChild(b);
  });
  allReadings.forEach((t,i)=>{
    const b = document.createElement('button');
    b.className = 'text-item reading';
    b.innerHTML = `<b>${T('lesson')} ${t.l}</b><span class="ti-zh">${t.t}</span>
      <span class="ti-tr">${S.settings.lang==='en'?t.ten:t.tes}</span>`;
    b.addEventListener('click', ()=> renderReader(t, 'reading'));
    lr.appendChild(b);
  });
}

let readerMode = 'none', readerTrans = false;
// ---------- Text Reader Logic ----------
let readerLines = [];
let readerIndex = 0;
let isPlaying = false;

window.playReader = function(startIndex = 0) {
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  readerIndex = startIndex;
  isPlaying = true;
  updateReaderUI();
  window.playNextLine();
};

window.stopReader = function() {
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  isPlaying = false;
  readerLines.forEach(l => l.row.classList.remove('reading-active'));
  updateReaderUI();
};

window.playNextLine = function() {
  if (!isPlaying) return;
  if (readerIndex >= readerLines.length) {
    window.stopReader();
    return;
  }
  
  readerLines.forEach(l => l.row.classList.remove('reading-active'));
  const current = readerLines[readerIndex];
  current.row.classList.add('reading-active');
  
  // Opcional: auto-scroll para mantener la línea en el centro
  current.row.scrollIntoView({behavior: 'smooth', block: 'center'});
  
  Core.speak(current.text, () => {
    readerIndex++;
    window.playNextLine();
  }, current.speaker);
};

function updateReaderUI() {
  const btn = $('#tg-audio');
  if(btn) btn.textContent = isPlaying ? '⏹️' : '🔊';
}

function renderReader(t, kind){
  window.stopReader();
  const v = setView(`
    <button id="back" class="back-btn">← ${T('back')}</button>
    <h2 class="reader-title">${t.t}</h2>
    <p class="reader-sub">${S.settings.lang==='en'?t.ten:t.tes} · ${T('lesson')} ${t.l}</p>
    <div class="reader-toggles">
      <button id="tg-pinyin">${T('pinyin')}</button>
      <button id="tg-tones">${T('tones')}</button>
      <button id="tg-trans">${T('trans')}</button>
      <button id="tg-audio" class="action-btn">🔊</button>
    </div>
    <div id="reader"></div>`);
  $('#back').addEventListener('click', renderTextList);
  $('#tg-audio').addEventListener('click', ()=>{
    if(isPlaying) window.stopReader();
    else window.playReader(0);
  });
  const update = ()=>{
    $('#tg-pinyin').classList.toggle('on', readerMode==='pinyin');
    $('#tg-tones').classList.toggle('on', readerMode==='tones');
    $('#tg-trans').classList.toggle('on', readerTrans);
    drawReader(t, kind);
  };
  $('#tg-pinyin').addEventListener('click', ()=>{ readerMode = readerMode==='pinyin'?'none':'pinyin'; update(); });
  $('#tg-tones').addEventListener('click', ()=>{ readerMode = readerMode==='tones'?'none':'tones'; update(); });
  $('#tg-trans').addEventListener('click', ()=>{ readerTrans = !readerTrans; update(); });
  update();
}

function drawReader(t, kind){
  const r = $('#reader');
  r.innerHTML = '';
  readerLines = [];
  const parts = kind === 'dialog' ? t.parts : [{lines: t.lines}];
  parts.forEach((p, pi)=>{
    if(kind === 'dialog'){
      const h = document.createElement('div');
      h.className = 'part-head';
      h.textContent = `${T('text1')} ${pi+1} — ${S.settings.lang==='en'?p.ien:p.ies}`;
      r.appendChild(h);
    }
    for(const line of p.lines){
      const row = document.createElement('div');
      row.className = 'line';
      if(line.s){
        const sp = document.createElement('div');
        sp.className = 'speaker';
        sp.appendChild(renderTokens(line.s, readerMode));
        row.appendChild(sp);
      }
      const zh = document.createElement('div');
      zh.className = 'line-zh';
      zh.appendChild(renderTokens(line.zh, readerMode));
      row.appendChild(zh);
      if(readerTrans){
        const tr = document.createElement('div');
        tr.className = 'line-tr';
        tr.textContent = S.settings.lang==='en' ? line.en : line.es;
        row.appendChild(tr);
      }
      r.appendChild(row);
      
      const lineObj = { row, text: line.zh, speaker: line.s };
      readerLines.push(lineObj);
      
      row.addEventListener('click', () => {
        window.playReader(readerLines.indexOf(lineObj));
      });
    }
  });
}

// ---------- VOCABULARIO ----------
function renderVocab(){
  const v = setView(`
    <input id="vsearch" class="search" placeholder="${T('search')}">
    <div id="vfilter" class="scroll-row"></div>
    <div id="vlist" class="vlist"></div>`);
  let activeFilter = 'all';
  const grid = $('#vfilter');
  
  const filters = ['all', 'hsk1', 'hsk2', 'hsk3', 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  filters.forEach(f => {
    const b = document.createElement('button');
    b.className = 'lesson-btn' + (f==='all' ? ' on' : '');
    b.style.display = 'inline-block';
    if(f === 'all') b.innerHTML = `<b>${T('all')}</b>`;
    else if (typeof f === 'string') b.innerHTML = `<b>${f.toUpperCase()}</b>`;
    else b.innerHTML = `<b>L${f===0?'✦':f}</b>`;
    
    b.addEventListener('click', () => { 
      activeFilter = f; 
      grid.querySelectorAll('.lesson-btn').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      draw(); 
    });
    grid.appendChild(b);
  });
  
  $('#vsearch').addEventListener('input', draw);
  
  function draw(){
    const q = $('#vsearch').value.trim().toLowerCase();
    const list = $('#vlist');
    list.innerHTML = '';
    
    let items = C.ALL.filter(e => {
      if (activeFilter === 'all') return true;
      if (typeof activeFilter === 'string') return e.tags && e.tags.includes(activeFilter);
      return e.l === activeFilter;
    });
    if(q) items = items.filter(e => e.h.includes(q) || e.p.toLowerCase().includes(q)
      || (e.es && e.es.toLowerCase().includes(q)) || (e.en && e.en.toLowerCase().includes(q)));
    items.slice(0, 400).forEach(e=>{
      const d = document.createElement('div');
      d.className = 'vrow' + (e.sup ? ' sup' : '');
      d.innerHTML = `<span class="vh">${e.h}</span><span class="vp">${e.p}</span>
        <span class="vg">${gloss(e)}</span><span class="vl">${e.l===0?'✦':e.l}</span>`;
      d.addEventListener('click', ()=> showPopup({t:e.h, entries: C.DICT.get(e.h)}));
      list.appendChild(d);
    });
  }
  draw();
}

// ---------- GRAMÁTICA ----------
function renderGrammar(){
  const v = setView(`
    <div id="gfilter" class="scroll-row">
       <button class="lesson-btn on" data-tag="all"><b>Todas</b></button>
       <button class="lesson-btn" data-tag="hsk1"><b>HSK 1</b></button>
       <button class="lesson-btn" data-tag="hsk2"><b>HSK 2</b></button>
       <button class="lesson-btn" data-tag="hsk3"><b>HSK 3</b></button>
       <button class="lesson-btn" data-tag="npcr"><b>NPCR</b></button>
    </div>
    <div id="glist" class="glist"></div>`);
    
  let currentTag = 'all';
  const grid = $('#gfilter');
  grid.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      grid.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      currentTag = b.dataset.tag;
      draw();
    });
  });
  
  function draw(){
    const list = $('#glist');
    list.innerHTML = '';
    const items = window.GRAMMAR.filter(g => currentTag === 'all' || 
      (currentTag === 'npcr' ? g.tags.some(t => t.startsWith('npcr')) : g.tags.includes(currentTag)));
      
    items.forEach(g => {
      const card = document.createElement('div');
      card.className = 'grammar-card';
      let exHTML = '';
      g.examples.forEach((ex, i) => {
        exHTML += `<div class="g-ex" data-id="${g.id}" data-idx="${i}">
           <div class="g-ex-zh">${ex.zh} <span class="g-speaker">(${ex.s}) 🔊</span></div>
           <div class="g-ex-tr">${S.settings.lang==='en'?ex.en:ex.es}</div>
        </div>`;
      });
      card.innerHTML = `
        <div class="g-title">${g.title}</div>
        <div class="g-tags">${g.tags.map(t => `<span class="g-tag">${t.toUpperCase()}</span>`).join('')}</div>
        <div class="g-desc">${g.desc}</div>
        <div class="g-examples">${exHTML}</div>
      `;
      list.appendChild(card);
    });
    
    // Add audio click handlers
    list.querySelectorAll('.g-ex').forEach(el => {
      el.addEventListener('click', () => {
        const g = window.GRAMMAR.find(x => x.id === el.dataset.id);
        const ex = g.examples[el.dataset.idx];
        Core.speak(ex.zh, null, ex.s);
      });
    });
  }
  draw();
}

// ---------- AJUSTES ----------
function renderSettings(){
  const v = setView(`
    <div class="setting"><label>${T('lang')}</label>
      <div class="seg"><button id="lang-es">Español</button><button id="lang-en">English</button></div></div>
    <div class="setting"><label>${T('textSize')}</label>
      <div class="seg">
        <button id="ts-small">${T('sizeSmall')}</button>
        <button id="ts-medium">${T('sizeMedium')}</button>
        <button id="ts-large">${T('sizeLarge')}</button>
      </div></div>
    <div class="setting"><label>${T('theme')}</label>
      <div class="seg">
        <button id="th-light">${T('light')}</button>
        <button id="th-dark">${T('dark')}</button>
        <button id="th-system">${T('system')}</button>
      </div></div>
    <div class="setting"><label>${T('maxLesson')}: <b id="ml-val">${S.settings.maxLesson}</b></label>
      <input type="range" id="max-lesson" min="1" max="20" value="${S.settings.maxLesson}"></div>
    <div class="setting"><label>${T('newPerDay')}: <b id="npd-val">${S.settings.newPerDay}</b></label>
      <input type="range" id="new-per-day" min="0" max="40" step="5" value="${S.settings.newPerDay}"></div>
    <div class="setting row"><label>${T('includeSup')}</label>
      <input type="checkbox" id="inc-sup" ${S.settings.includeSup?'checked':''}></div>
      
    <div class="setting"><label>${T('voiceSpeed')}: <b id="vs-val">${S.settings.voiceSpeed || 1.0}x</b></label>
      <input type="range" id="voice-speed" min="0.5" max="1.5" step="0.1" value="${S.settings.voiceSpeed || 1.0}"></div>
    <div class="setting"><label>${T('voice')}</label>
      <div style="display:flex; gap:8px;">
        <select id="voice-select" style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--line); background:var(--card-bg); color:var(--ink); font-size:14px;"></select>
        <button id="test-voice" class="big-btn secondary" style="margin:0; width:auto; padding:8px 16px;">${T('testVoice')}</button>
      </div></div>
      
    <div class="setting">
      <button id="export" class="big-btn secondary">${T('exportBtn')}</button>
      <button id="import" class="big-btn secondary">${T('importBtn')}</button>
      <input type="file" id="import-file" accept=".json" style="display:none">
      <button id="reset" class="big-btn danger">${T('resetBtn')}</button>
    </div>
    <p class="about">NPCR · El Nuevo Libro de Chino Práctico 1 & 2</p>`);
  const markLang = ()=>{
    $('#lang-es').classList.toggle('on', S.settings.lang==='es');
    $('#lang-en').classList.toggle('on', S.settings.lang==='en');
  };
  markLang();
  
  const markTs = ()=>{
    $('#ts-small').classList.toggle('on', S.settings.textSize==='small');
    $('#ts-medium').classList.toggle('on', S.settings.textSize==='medium');
    $('#ts-large').classList.toggle('on', S.settings.textSize==='large');
  };
  markTs();

  const markTh = ()=>{
    $('#th-light').classList.toggle('on', S.settings.theme==='light');
    $('#th-dark').classList.toggle('on', S.settings.theme==='dark');
    $('#th-system').classList.toggle('on', S.settings.theme==='system');
  };
  markTh();

  $('#lang-es').addEventListener('click', ()=>{ S.settings.lang='es'; S.saveSettings(); markLang(); renderTabs(); });
  $('#lang-en').addEventListener('click', ()=>{ S.settings.lang='en'; S.saveSettings(); markLang(); renderTabs(); });
  $('#ts-small').addEventListener('click', ()=>{ S.settings.textSize='small'; S.saveSettings(); markTs(); applyTheme(); });
  $('#ts-medium').addEventListener('click', ()=>{ S.settings.textSize='medium'; S.saveSettings(); markTs(); applyTheme(); });
  $('#ts-large').addEventListener('click', ()=>{ S.settings.textSize='large'; S.saveSettings(); markTs(); applyTheme(); });
  $('#th-light').addEventListener('click', ()=>{ S.settings.theme='light'; S.saveSettings(); markTh(); applyTheme(); });
  $('#th-dark').addEventListener('click', ()=>{ S.settings.theme='dark'; S.saveSettings(); markTh(); applyTheme(); });
  $('#th-system').addEventListener('click', ()=>{ S.settings.theme='system'; S.saveSettings(); markTh(); applyTheme(); });

  $('#max-lesson').addEventListener('input', e=>{ S.settings.maxLesson=+e.target.value; $('#ml-val').textContent=e.target.value; S.saveSettings(); });
  $('#new-per-day').addEventListener('input', e=>{ S.settings.newPerDay=+e.target.value; $('#npd-val').textContent=e.target.value; S.saveSettings(); });
  $('#inc-sup').addEventListener('change', e=>{ S.settings.includeSup=e.target.checked; S.saveSettings(); });
  
  const populateVoices = () => {
    const sel = $('#voice-select');
    if(!sel) return;
    const premium = ['premium', 'tingting', 'ting-ting', 'meijia', 'google', 'xiaoxiao'];
    const voices = speechSynthesis.getVoices().filter(v => {
      if(!v.lang.includes('zh')) return false;
      const name = v.name.toLowerCase();
      if(name.includes('hk') || name.includes('yue') || name.includes('粤')) return false;
      return premium.some(k => name.includes(k));
    });
    
    sel.innerHTML = '<option value="">' + T('autoVoice') + '</option>' + 
      voices.map(v => {
        let source = 'Local';
        const uri = (v.voiceURI || '').toLowerCase();
        const n = v.name.toLowerCase();
        if(n.includes('google')) source = 'Google Chrome';
        else if(uri.includes('apple') || n.includes('tingting') || n.includes('meijia')) source = 'Apple / iOS';
        else if(uri.includes('microsoft') || n.includes('xiaoxiao')) source = 'Microsoft Edge';
        else if(!v.localService) source = 'Cloud';
        
        // Limpiar el nombre para que no se vea tan largo si ya incluye la fuente
        let cleanName = v.name.replace('（中国大陆）', '').replace('(China mainland)', '').trim();
        
        return `<option value="${v.voiceURI}" ${S.settings.voiceURI === v.voiceURI ? 'selected' : ''}>${cleanName} (${source})</option>`;
      }).join('');
  };
  populateVoices();
  if(speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }
  $('#voice-select').addEventListener('change', e=>{ S.settings.voiceURI=e.target.value; S.saveSettings(); });
  $('#voice-speed').addEventListener('input', e=>{ S.settings.voiceSpeed=+e.target.value; $('#vs-val').textContent=e.target.value+'x'; S.saveSettings(); });
  $('#test-voice').addEventListener('click', ()=>{ Core.speak('你好，欢迎学习中文！'); });
  
  $('#export').addEventListener('click', ()=>{
    const blob = new Blob([S.exportData()], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mandarin-progreso-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
  });
  $('#import').addEventListener('click', ()=> $('#import-file').click());
  $('#import-file').addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{ try { S.importData(r.result); alert(T('imported')); renderSettings(); } catch(err){ alert('Error: '+err.message); } };
    r.readAsText(f);
  });
  $('#reset').addEventListener('click', ()=>{
    if(confirm(T('resetConfirm'))){ S.resetAll(); renderSettings(); }
  });
}

function renderTabs(){
  if(window.stopReader) window.stopReader();
  $('#tab-study .tab-label').textContent = T('study');
  $('#tab-texts .tab-label').textContent = T('texts');
  $('#tab-vocab .tab-label').textContent = T('vocab');
  $('#tab-grammar .tab-label').textContent = T('grammar');
  $('#tab-settings .tab-label').textContent = T('settings');
  nav(current);
}

// ---------- init ----------
function applyTheme() {
  // text size
  document.body.className = document.body.className.replace(/text-(small|medium|large)/, '').trim();
  if(!S.settings.textSize) S.settings.textSize = 'medium';
  document.body.classList.add('text-' + S.settings.textSize);
  
  // colors
  document.body.classList.remove('theme-light', 'theme-dark');
  if(!S.settings.theme) S.settings.theme = 'system';
  if(S.settings.theme === 'light') document.body.classList.add('theme-light');
  else if(S.settings.theme === 'dark') document.body.classList.add('theme-dark');
}

applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if(S.settings.theme === 'system') applyTheme();
});
renderTabs();
nav('study');
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
