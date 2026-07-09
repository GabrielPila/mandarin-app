// views/settings.js — ajustes
import { settings, saveSettings, exportData, importData, resetAll } from '../store.js';
import { T } from '../i18n.js';
import { speak, premiumChineseVoices } from '../audio.js';
import { $, setView, applyTheme } from '../ui.js';
import { register, nav } from '../router.js';

let onLangChange = () => {};
export function setLangChangeHandler(fn) { onLangChange = fn; }

export function renderSettings() {
  setView(`
    <div class="setting"><label>${T('lang')}</label>
      <div class="seg"><button id="lang-es">Español</button><button id="lang-en">English</button></div></div>
    <div class="setting"><label>${T('textSize')}</label>
      <div class="seg"><button id="ts-small">${T('sizeSmall')}</button><button id="ts-medium">${T('sizeMedium')}</button><button id="ts-large">${T('sizeLarge')}</button></div></div>
    <div class="setting"><label>${T('theme')}</label>
      <div class="seg"><button id="th-light">${T('light')}</button><button id="th-dark">${T('dark')}</button><button id="th-system">${T('system')}</button></div></div>
    <div class="setting"><label>${T('maxLesson')}: <b id="ml-val">${settings.maxLesson}</b></label>
      <input type="range" id="max-lesson" min="1" max="20" value="${settings.maxLesson}"></div>
    <div class="setting"><label>${T('newPerDay')}: <b id="npd-val">${settings.newPerDay}</b></label>
      <input type="range" id="new-per-day" min="0" max="40" step="5" value="${settings.newPerDay}"></div>
    <div class="setting row"><label>${T('includeSup')}</label>
      <input type="checkbox" id="inc-sup" ${settings.includeSup ? 'checked' : ''}></div>
    <div class="setting row"><label>${T('reverse')} (${T('reverseDesc')})</label>
      <input type="checkbox" id="rev-cards" ${settings.reverseCards ? 'checked' : ''}></div>
    <div class="setting"><label>${T('voiceSpeed')}: <b id="vs-val">${settings.voiceSpeed || 1.0}x</b></label>
      <input type="range" id="voice-speed" min="0.5" max="1.5" step="0.1" value="${settings.voiceSpeed || 1.0}"></div>
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

  const seg = (ids, get, set) => ids.forEach(([id, val]) => {
    const el = $('#' + id);
    el.classList.toggle('on', get() === val);
    el.addEventListener('click', () => { set(val); saveSettings(); ids.forEach(([i, v]) => $('#' + i).classList.toggle('on', get() === v)); });
  });
  seg([['lang-es', 'es'], ['lang-en', 'en']], () => settings.lang, v => { settings.lang = v; onLangChange(); });
  seg([['ts-small', 'small'], ['ts-medium', 'medium'], ['ts-large', 'large']], () => settings.textSize, v => { settings.textSize = v; applyTheme(); });
  seg([['th-light', 'light'], ['th-dark', 'dark'], ['th-system', 'system']], () => settings.theme, v => { settings.theme = v; applyTheme(); });

  $('#max-lesson').addEventListener('input', e => { settings.maxLesson = +e.target.value; $('#ml-val').textContent = e.target.value; saveSettings(); });
  $('#new-per-day').addEventListener('input', e => { settings.newPerDay = +e.target.value; $('#npd-val').textContent = e.target.value; saveSettings(); });
  $('#inc-sup').addEventListener('change', e => { settings.includeSup = e.target.checked; saveSettings(); });
  $('#rev-cards').addEventListener('change', e => { settings.reverseCards = e.target.checked; saveSettings(); });

  const populateVoices = () => {
    const sel = $('#voice-select'); if (!sel) return;
    const voices = premiumChineseVoices();
    sel.innerHTML = '<option value="">' + T('autoVoice') + '</option>' +
      voices.map(v => {
        let source = 'Local';
        const uri = (v.voiceURI || '').toLowerCase(), nm = v.name.toLowerCase();
        if (nm.includes('google')) source = 'Google Chrome';
        else if (uri.includes('apple') || nm.includes('tingting') || nm.includes('meijia')) source = 'Apple / iOS';
        else if (uri.includes('microsoft') || nm.includes('xiaoxiao')) source = 'Microsoft Edge';
        else if (!v.localService) source = 'Cloud';
        const cleanName = v.name.replace('（中国大陆）', '').replace('(China mainland)', '').trim();
        return `<option value="${v.voiceURI}" ${settings.voiceURI === v.voiceURI ? 'selected' : ''}>${cleanName} (${source})</option>`;
      }).join('');
  };
  populateVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = populateVoices;
  $('#voice-select').addEventListener('change', e => { settings.voiceURI = e.target.value; saveSettings(); });
  $('#voice-speed').addEventListener('input', e => { settings.voiceSpeed = +e.target.value; $('#vs-val').textContent = e.target.value + 'x'; saveSettings(); });
  $('#test-voice').addEventListener('click', () => speak('你好，欢迎学习中文！'));

  $('#export').addEventListener('click', () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mandarin-progreso-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  });
  $('#import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { importData(r.result); alert(T('imported')); renderSettings(); } catch (err) { alert('Error: ' + err.message); } };
    r.readAsText(f);
  });
  $('#reset').addEventListener('click', () => { if (confirm(T('resetConfirm'))) { resetAll(); renderSettings(); } });
}

register('settings', renderSettings);
