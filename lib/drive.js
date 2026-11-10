'use strict';
// Google Drive fotoğraf klasörü: dosya adı -> dosya numarası eşlemesi.
const { fold } = require('./text');
const { fetchText } = require('./http');

let cache = { t: 0, key: '', files: null };
const TTL = 5 * 60 * 1000;
// Tüm yaygın resim formatlarını (jpg, jpeg, png, heic, webp, gif, vb.) destekle
const IMG = /^image\/(jpeg|png|webp|gif|heic|heif|bmp|tiff)$/i;

function baseName(name) {
  return String(name || '').replace(/\.[^/.]+$/, '');
}

async function listFolder(cfg) {
  if (!cfg.apiKey || !cfg.folderId) return null;
  const key = cfg.folderId + '|' + cfg.apiKey;
  if (cache.files && cache.key === key && Date.now() - cache.t < TTL) return cache.files;
  const files = [];
  let token = '';
  for (let page = 0; page < 10; page++) {
    const q = "'" + cfg.folderId + "' in parents and trashed=false";
    const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
      '&fields=' + encodeURIComponent('nextPageToken,files(id,name,mimeType,modifiedTime)') +
      '&pageSize=1000&key=' + encodeURIComponent(cfg.apiKey) + (token ? '&pageToken=' + encodeURIComponent(token) : '');
    const j = JSON.parse(await fetchText(url, cfg.timeoutMs));
    (j.files || []).forEach((f) => {
      // mimeType boş olsa bile resim uzantılı dosyaları kabul et
      const mime = f.mimeType || '';
      const name = f.name || '';
      if (IMG.test(mime) || /\.(jpe?g|png|webp|gif|heic|heif|bmp|tiff)$/i.test(name)) {
        files.push(f);
      }
    });
    token = j.nextPageToken || '';
    if (!token) break;
  }
  cache = { t: Date.now(), key, files };
  return files;
}

// fold(dosya adı) -> { id, v }
function indexFiles(files) {
  const idx = new Map();
  (files || []).forEach((f) => {
    const k = fold(baseName(f.name));
    if (k && !idx.has(k)) idx.set(k, { id: f.id, v: Date.parse(f.modifiedTime || '') ? Date.parse(f.modifiedTime).toString(36) : '0', name: f.name });
  });
  return idx;
}

function resetCache() { cache = { t: 0, key: '', files: null }; }

module.exports = { listFolder, indexFiles, baseName, resetCache };
