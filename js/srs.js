// srs.js — repetición espaciada (SM-2 simplificado) + almacenamiento
(function(){
'use strict';
const KEY = 'mandarin.srs.v1';
const SETTINGS_KEY = 'mandarin.settings.v1';
const DAY = 24*60*60*1000;

let state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ state = {}; }

function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }

function get(id){ return state[id]; }

// grade: 0=otra vez, 3=difícil, 4=bien, 5=fácil
function review(id, grade){
  const now = Date.now();
  let c = state[id] || {ef:2.5, ivl:0, reps:0, due:now};
  if(grade < 3){
    c.reps = 0; c.ivl = 0;
    c.due = now + 10*60*1000; // 10 min
  } else {
    if(c.reps === 0) c.ivl = 1;
    else if(c.reps === 1) c.ivl = grade === 5 ? 4 : 3;
    else c.ivl = Math.round(c.ivl * c.ef);
    if(grade === 3) c.ivl = Math.max(1, Math.round(c.ivl * 0.8));
    c.ef = Math.max(1.3, c.ef + (0.1 - (5-grade)*(0.08+(5-grade)*0.02)));
    c.reps += 1;
    c.due = now + c.ivl * DAY;
  }
  c.last = now;
  state[id] = c;
  save();
}

function dueCards(pool){
  const now = Date.now();
  return pool.filter(e => state[e.id] && state[e.id].due <= now);
}
function newCards(pool){
  return pool.filter(e => !state[e.id]);
}
function stats(pool){
  const now = Date.now();
  let learned=0, due=0;
  for(const e of pool){
    const c = state[e.id];
    if(c){ learned++; if(c.due <= now) due++; }
  }
  return {total: pool.length, learned, due, fresh: pool.length - learned};
}

// ---------- ajustes ----------
let settings = {lang:'es', includeSup:false, newPerDay:10, maxLesson:10};
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch(e){}
function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

// ---------- exportar / importar ----------
function exportData(){
  return JSON.stringify({v:1, exported:new Date().toISOString(), srs:state, settings});
}
function importData(json){
  const d = JSON.parse(json);
  if(!d || typeof d.srs !== 'object') throw new Error('formato inválido');
  state = d.srs; save();
  if(d.settings){ Object.assign(settings, d.settings); saveSettings(); }
}
function resetAll(){ state = {}; save(); }

window.SRS = { get, review, dueCards, newCards, stats, settings, saveSettings, exportData, importData, resetAll };
})();
