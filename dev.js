'use strict';
// Yerel deneme sunucusu: public/ klasörünü ve /api uçlarını sunar. Kullanım: DEV_MOCK=1 node dev.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.env.PORT) || 5173;
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
(async () => {
  if (process.env.DEV_MOCK) {
    if (process.env.GOOGLE_API_KEY === undefined) process.env.GOOGLE_API_KEY = 'test-key';
    if (process.env.DRIVE_FOLDER_ID === undefined) process.env.DRIVE_FOLDER_ID = 'test-folder';
    await require('./test/mockfetch').install();
  }
  const menu = require('./api/menu');
  const photo = require('./api/photo');
  http.createServer((req, res) => {
    const p = req.url.split('?')[0];
    if (p === '/api/menu') return menu(req, res);
    if (p === '/api/photo') return photo(req, res);
    const rel = p === '/' ? '/index.html' : p === '/kontrol' ? '/kontrol.html' : p;
    const file = path.join(PUB, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    fs.readFile(file, (err, buf) => {
      if (err) { // Vercel'deki yönlendirmeler gibi: bilinmeyen adres menüye düşer
        return fs.readFile(path.join(PUB, 'index.html'), (e2, b2) => { res.writeHead(e2 ? 404 : 200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(b2 || 'yok'); });
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  }).listen(PORT, () => console.log('http://localhost:' + PORT));
})();
