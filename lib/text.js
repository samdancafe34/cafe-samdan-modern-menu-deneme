'use strict';
// Türkçe harfleri, büyük/küçük harfi, boşluk ve noktalamayı yok sayan karşılaştırma anahtarı.
function fold(s) {
  s = String(s == null ? '' : s).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  s = s.replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
}

// "12,5", "12.5", "1.200", "1.200,50", "12 TL", "₺12" gibi girişleri sayıya çevirir.
// Dönüş: { value: sayı|null, error: null|'sayı değil'|'negatif' }
function parseNumber(raw) {
  let s = String(raw == null ? '' : raw).trim();
  if (s === '') return { value: null, error: null };
  s = s.replace(/₺/g, '').replace(/[\s ]*(kcal|gr|tl|try|g)[\s ]*$/i, '').replace(/[\s ]/g, '');
  if (!/^-?[\d.,]+$/.test(s) || !/\d/.test(s)) return { value: null, error: 'sayı değil' };
  const hasComma = s.indexOf(',') >= 0;
  const hasDot = s.indexOf('.') >= 0;
  if (hasComma && hasDot) {
    const dec = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
    const thou = dec === ',' ? '.' : ',';
    s = s.split(thou).join('').replace(dec, '.');
  } else if (hasComma) {
    s = s.replace(',', '.'); // Türkçe: virgül ondalıktır
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s) && s[0] !== '0') {
    s = s.replace(/\./g, ''); // 1.200 -> 1200 (binlik ayırıcı)
  }
  const n = Number(s);
  if (!isFinite(n)) return { value: null, error: 'sayı değil' };
  if (n < 0) return { value: null, error: 'negatif' };
  return { value: n, error: null };
}

function truthy(v) {
  return ['e', 'evet', 'x', '1', 'true', 'yes', 'var'].indexOf(fold(v)) >= 0;
}

// YYYY-AA-GG, GG.AA.YYYY, GG/AA/YYYY -> YYYY-AA-GG (tanınmazsa null)
function parseDate(raw) {
  const s = String(raw == null ? '' : raw).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const p = (n) => (n < 10 ? '0' : '') + n;
  return y + '-' + p(mo) + '-' + p(d);
}

module.exports = { fold, parseNumber, truthy, parseDate };
