'use strict';
// Google E-Tablo ve Drive yanıtlarını taklit eder (gerçek ağ gerekmez).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const FX = path.join(__dirname, 'fixtures');
const state = { products: null, categories: null, settings: null, fail: false, failTabs: {}, drive: true, driveFiles: null, calls: [] };

function reset() {
  state.products = fs.readFileSync(path.join(FX, 'urunler.csv'), 'utf8');
  state.categories = fs.readFileSync(path.join(FX, 'kategoriler.csv'), 'utf8');
  state.settings = fs.readFileSync(path.join(FX, 'ayarlar.csv'), 'utf8');
  state.fail = false; state.failTabs = {}; state.drive = true; state.calls = [];
  state.driveFiles = [
    { id: 'FILE_KUZUSIS_DURUM_1', name: 'Kuzu Şiş Dürüm.jpg', mimeType: 'image/jpeg', modifiedTime: '2026-11-05T10:00:00.000Z' },
    { id: 'FILE_ADANA_KEBAP_0002', name: 'ADANA KEBAP.JPG', mimeType: 'image/jpeg', modifiedTime: '2026-11-05T10:00:00.000Z' },
    { id: 'FILE_SUCUKLU_MENEMEN_3', name: 'sucuklu-menemen.png', mimeType: 'image/png', modifiedTime: '2026-11-04T09:00:00.000Z' },
    { id: 'FILE_NOT_AN_IMAGE_0004', name: 'notlar.txt', mimeType: 'text/plain', modifiedTime: '2026-11-04T09:00:00.000Z' }
  ];
}
const resp = (body, ok = true, status = 200, type = 'text/plain') => ({
  ok, status, headers: { get: () => type },
  text: async () => body, arrayBuffer: async () => (Buffer.isBuffer(body) ? body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) : Buffer.from(body)),
  json: async () => JSON.parse(body)
});

async function install() {
  reset();
  const big = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg().toBuffer();
  global.fetch = async (url) => {
    url = String(url);
    state.calls.push(url);
    if (url.indexOf('docs.google.com') >= 0) {
      if (state.fail) throw new Error('ağ hatası');
      const m = { 2135674355: 'products', 1872347410: 'categories', 1025246748: 'settings' };
      const k = Object.keys(m).find((g) => url.indexOf(g) >= 0);
      if (state.failTabs[m[k]]) return resp('', false, 500);
      return resp(state[m[k]]);
    }
    if (url.indexOf('googleapis.com/drive/v3/files?') >= 0) {
      if (!state.drive) return resp('{"error":"x"}', false, 403);
      return resp(JSON.stringify({ files: state.driveFiles }));
    }
    if (url.indexOf('googleapis.com/drive/v3/files/') >= 0 && url.indexOf('alt=media') >= 0) return resp(big, true, 200, 'image/jpeg');
    return resp('', false, 404);
  };
  return state;
}
module.exports = { install, state, reset };
