// audio.js — síntesis de voz (TTS) y reproductor del lector línea a línea
import { settings } from './store.js';

const MALE_NAMES = ['丁力波', '马大为', '宋华', '陆雨平', '大为', '力波', '王家明'];

export function speak(text, onEnd, speaker) {
  if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';

  let isMale = false;
  if (speaker && MALE_NAMES.some(n => speaker.includes(n))) isMale = true;

  u.rate = settings.voiceSpeed || 1.0;
  const voices = speechSynthesis.getVoices();

  // Tono por personaje (asumiendo voz base femenina)
  let pitch = 1.0;
  if (speaker) {
    if (speaker.includes('马大为')) pitch = 0.35;
    else if (speaker.includes('丁力波')) pitch = 0.55;
    else if (speaker.includes('宋华')) pitch = 0.45;
    else if (speaker.includes('王小云')) pitch = 1.3;
    else if (speaker.includes('林娜')) pitch = 1.1;
    else if (speaker.includes('陈老师')) pitch = 0.85;
    else if (isMale) pitch = 0.5;
  }

  if (settings.voiceURI) {
    const v = voices.find(v => v.voiceURI === settings.voiceURI);
    if (v) u.voice = v;
    u.pitch = pitch;
  } else if (isMale) {
    const malePremium = voices.find(v => v.lang.includes('zh') && (v.name.includes('Yunyang') || v.name.includes('Yunxi') || v.name.includes('Standard-B') || v.name.includes('Standard-C')));
    if (malePremium) {
      u.voice = malePremium;
      if (speaker.includes('马大为')) u.pitch = 0.8;
      else if (speaker.includes('丁力波')) u.pitch = 1.1;
      else u.pitch = 1.0;
    } else {
      const best = voices.find(v => v.lang.includes('zh') && (v.name.includes('Premium') || v.name.includes('Ting-Ting') || v.name.includes('Google') || v.name.includes('Xiaoxiao')));
      if (best) u.voice = best;
      u.pitch = pitch;
    }
  } else {
    const best = voices.find(v => v.lang.includes('zh') && (v.name.includes('Premium') || v.name.includes('Ting-Ting') || v.name.includes('Google') || v.name.includes('Xiaoxiao')));
    if (best) u.voice = best;
    u.pitch = pitch;
  }

  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// Lista de voces chinas "premium" para el selector de ajustes
export function premiumChineseVoices() {
  const premium = ['premium', 'tingting', 'ting-ting', 'meijia', 'google', 'xiaoxiao'];
  return speechSynthesis.getVoices().filter(v => {
    if (!v.lang.includes('zh')) return false;
    const name = v.name.toLowerCase();
    if (name.includes('hk') || name.includes('yue') || name.includes('粤')) return false;
    return premium.some(k => name.includes(k));
  });
}

// ---------- Reproductor del lector (líneas: {row, text, speaker}) ----------
export function createReaderPlayer() {
  let lines = [], index = 0, playing = false, onState = null;

  function stop() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    playing = false;
    lines.forEach(l => l.row.classList.remove('reading-active'));
    if (onState) onState(false);
  }
  function next() {
    if (!playing) return;
    if (index >= lines.length) { stop(); return; }
    lines.forEach(l => l.row.classList.remove('reading-active'));
    const cur = lines[index];
    cur.row.classList.add('reading-active');
    cur.row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    speak(cur.text, () => { index++; next(); }, cur.speaker);
  }
  function play(start = 0) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    index = start; playing = true;
    if (onState) onState(true);
    next();
  }
  return {
    setLines(l) { lines = l; },
    play, stop,
    isPlaying: () => playing,
    onStateChange(cb) { onState = cb; }
  };
}
