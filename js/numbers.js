// numbers.js — conversión de números, precios, horas y fechas a hanzi (para dictado)
const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// 0..99999 en hanzi. `liang` usa 两 para 2 en posiciones de 百/千/万 iniciales.
export function numToHanzi(n, liang = true) {
  n = Math.floor(n);
  if (n < 0) return '负' + numToHanzi(-n, liang);
  if (n < 10) return D[n];
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return (t === 1 ? '十' : D[t] + '十') + (o ? D[o] : '');
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), rest = n % 100;
    let s = (liang && h === 2 ? '两' : D[h]) + '百';
    if (rest === 0) return s;
    if (rest < 10) return s + '零' + D[rest];
    if (rest < 20) return s + '一十' + (rest % 10 ? D[rest % 10] : ''); // 105→一百零五, 115→一百一十五
    return s + numToHanzi(rest, false);
  }
  if (n < 10000) {
    const th = Math.floor(n / 1000), rest = n % 1000;
    let s = (liang && th === 2 ? '两' : D[th]) + '千';
    if (rest === 0) return s;
    if (rest < 100) return s + '零' + numToHanzi(rest, false);
    return s + numToHanzi(rest, false);
  }
  const w = Math.floor(n / 10000), rest = n % 10000;
  let s = (liang && w === 2 ? '两' : numToHanzi(w, liang)) + '万';
  if (rest === 0) return s;
  if (rest < 1000) return s + '零' + numToHanzi(rest, false);
  return s + numToHanzi(rest, false);
}

// precio en kuai/mao: X块Y毛(钱). mao 0 → solo kuai.
export function priceToHanzi(kuai, mao = 0) {
  let s = numToHanzi(kuai) + '块';
  if (mao > 0) s += numToHanzi(mao) + '毛';
  return s;
}

// hora en formato reloj: X点 (半 | 一刻 | 三刻 | Y分)
export function timeToHanzi(h, m = 0) {
  let s = (h === 2 ? '两' : numToHanzi(h)) + '点'; // 2 en punto = 两点
  if (m === 0) return s;
  if (m === 15) return s + '一刻';
  if (m === 30) return s + '半';
  if (m === 45) return s + '三刻';
  if (m < 10) return s + '零' + numToHanzi(m) + '分';
  return s + numToHanzi(m) + '分';
}

// fecha: X月Y号
export function dateToHanzi(month, day) {
  return numToHanzi(month) + '月' + numToHanzi(day) + '号';
}
