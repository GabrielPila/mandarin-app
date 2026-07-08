// core.js — diccionario, segmentación, pinyin/tonos
(function(){
'use strict';

// ---------- Diccionario ----------
const ALL = [];
window.B1_VOCAB.forEach((e,i)=>{ e.id='b1:'+i; e.book=1; ALL.push(e); });
window.B1_SUP.forEach((e,i)=>{ e.id='b1s:'+i; e.book=1; ALL.push(e); });
window.B2_VOCAB.forEach((e,i)=>{ e.id='b2:'+i; e.book=2; ALL.push(e); });
window.B2_SUP.forEach((e,i)=>{ e.id='b2s:'+i; e.book=2; ALL.push(e); });

const DICT = new Map(); // hanzi -> [entries]
let MAXLEN = 1;
for(const e of ALL){
  if(!DICT.has(e.h)) DICT.set(e.h, []);
  DICT.get(e.h).push(e);
  if(e.h.length > MAXLEN) MAXLEN = e.h.length;
}

// ---------- Segmentación (longest match) ----------
const isHan = ch => /[㐀-鿿豈-﫿]/.test(ch);

function segment(text){
  const tokens = [];
  let i = 0;
  while(i < text.length){
    const ch = text[i];
    if(!isHan(ch)){
      // agrupar no-han consecutivos (puntuación, números, latín)
      let j = i+1;
      while(j < text.length && !isHan(text[j])) j++;
      tokens.push({t: text.slice(i,j), plain:true});
      i = j;
      continue;
    }
    let matched = null;
    for(let len = Math.min(MAXLEN, text.length - i); len >= 1; len--){
      const cand = text.slice(i, i+len);
      if(DICT.has(cand)){ matched = cand; break; }
    }
    if(matched){
      tokens.push({t: matched, entries: DICT.get(matched)});
      i += matched.length;
    } else {
      tokens.push({t: ch, plain:true});
      i += 1;
    }
  }
  return tokens;
}

// ---------- Pinyin / tonos ----------
const TONED = {
  '1':'āēīōūǖĀĒĪŌŪǕ', '2':'áéíóúǘÁÉÍÓÚǗ', '3':'ǎěǐǒǔǚǍĚǏǑǓǙ', '4':'àèìòùǜÀÈÌÒÙǛ'
};
function toneOf(syl){
  for(const t of ['1','2','3','4']){
    for(const c of TONED[t]) if(syl.includes(c)) return +t;
  }
  return 0; // neutro
}
const TONE_MARK = ['·','ˉ','ˊ','ˇ','ˋ'];

// divide el pinyin de una palabra en sílabas alineadas con sus caracteres
function syllables(entry){
  const syls = entry.p.split(/[\s'\-]+/).filter(s=>s.length);
  const chars = Array.from(entry.h);
  if(syls.length === chars.length) return syls;
  // erhua: última sílaba termina en r y hay un 儿 extra
  if(chars.length === syls.length + 1 && chars[chars.length-1] === '儿'){
    return syls.concat(['']);
  }
  // desalineado: repartir lo mejor posible
  const out = [];
  for(let i=0;i<chars.length;i++) out.push(syls[i] || '');
  return out;
}

const MALE_NAMES = ['丁力波', '马大为', '宋华', '陆雨平', '大为', '力波', '王家明'];

// ---------- Audio ----------
function speak(text, onEnd, speaker){
  if(!window.speechSynthesis) {
    if(onEnd) onEnd();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  
  let isMale = false;
  if(speaker && MALE_NAMES.some(n => speaker.includes(n))) isMale = true;

  if (window.SRS && window.SRS.settings) {
    u.rate = window.SRS.settings.voiceSpeed || 1.0;
    const voices = speechSynthesis.getVoices();
    
    // Per-character pitch mappings (assuming a female base voice)
    let pitch = 1.0;
    if (speaker) {
      if (speaker.includes('马大为')) pitch = 0.35; // Very deep male
      else if (speaker.includes('丁力波')) pitch = 0.55; // Standard simulated male
      else if (speaker.includes('宋华')) pitch = 0.45;
      else if (speaker.includes('王小云')) pitch = 1.3; // High female
      else if (speaker.includes('林娜')) pitch = 1.1; // Slightly higher female
      else if (speaker.includes('陈老师')) pitch = 0.85; // Older female (deeper)
      else if (isMale) pitch = 0.5; // Generic male
    }
    
    if (window.SRS.settings.voiceURI) {
      const v = voices.find(v => v.voiceURI === window.SRS.settings.voiceURI);
      if (v) u.voice = v;
      u.pitch = pitch;
    } else {
      if (isMale) {
        const malePremium = voices.find(v => v.lang.includes('zh') && (v.name.includes('Yunyang') || v.name.includes('Yunxi') || v.name.includes('Standard-B') || v.name.includes('Standard-C')));
        if (malePremium) {
          u.voice = malePremium;
          // Si encontramos voz masculina nativa, no aplicamos los pitch shift agresivos
          if (speaker.includes('马大为')) u.pitch = 0.8;
          else if (speaker.includes('丁力波')) u.pitch = 1.1;
          else u.pitch = 1.0;
        } else {
          const best = voices.find(v => v.lang.includes('zh') && (v.name.includes('Premium') || v.name.includes('Ting-Ting') || v.name.includes('Google') || v.name.includes('Xiaoxiao')));
          if(best) u.voice = best;
          u.pitch = pitch; // Aplica pitch shift simulado
        }
      } else {
        const best = voices.find(v => v.lang.includes('zh') && (v.name.includes('Premium') || v.name.includes('Ting-Ting') || v.name.includes('Google') || v.name.includes('Xiaoxiao')));
        if(best) u.voice = best;
        u.pitch = pitch;
      }
    }
  }
  if(onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

window.Core = { ALL, DICT, segment, toneOf, TONE_MARK, syllables, isHan, speak };
})();
