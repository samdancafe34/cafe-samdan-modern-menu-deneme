'use strict';
const getConfig = require('../lib/config');
const { listFolder } = require('../lib/drive');
const { fetchBuffer } = require('../lib/http');

let sharp = null;
try { sharp = require('sharp'); } catch (e) { sharp = null; }
const WIDTHS = [240, 480, 900];

function fail(res, code, msg) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(msg);
}

module.exports = async (req, res) => {
  try {
    const cfg = getConfig();
    const q = new URL(req.url, 'http://x').searchParams;
    const id = q.get('id') || '';
    const w = WIDTHS.indexOf(Number(q.get('w'))) >= 0 ? Number(q.get('w')) : 900;
    if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) return fail(res, 400, 'bad id');
    const files = await listFolder(cfg);
    if (!files) return fail(res, 404, 'photos disabled');
    if (!files.some((f) => f.id === id)) return fail(res, 404, 'not in folder'); // açık vekil (proxy) olmasın
    const src = await fetchBuffer('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media&key=' + encodeURIComponent(cfg.apiKey));
    let out = src.buf;
    let type = src.type.split(';')[0] || 'image/jpeg';
    if (sharp) {
      out = await sharp(src.buf).rotate().resize({ width: w, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      type = 'image/jpeg';
    } else if (out.length > 3.5 * 1024 * 1024) return fail(res, 502, 'image too large and resizer unavailable');
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    // adres içindeki v= dosya sürümünü taşır; fotoğraf değişince adres de değişir
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.end(out);
  } catch (e) {
    fail(res, 502, 'photo error');
  }
};
