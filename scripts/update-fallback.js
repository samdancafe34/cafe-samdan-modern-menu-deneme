'use strict';
// İsteğe bağlı: E-Tablo'daki güncel menüyü public/fallback.json (acil durum yedeği) olarak kaydeder.
// Kullanım: node scripts/update-fallback.js
const fs = require('fs');
const path = require('path');
const { getMenu } = require('../lib/service');
const file = path.join(__dirname, '..', 'public', 'fallback.json');
(async () => {
  const old = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = await getMenu(old);
  if (!r.ok) { console.error('E-Tablo okunamadı, yedek değişmedi:', r.body.meta.error); process.exit(1); }
  const b = r.body;
  fs.writeFileSync(file, JSON.stringify({ cafe: b.cafe, categories: b.categories, products: b.products.map((p) => Object.assign({}, p, { photo: null })) }));
  console.log('Yedek güncellendi:', b.products.length, 'ürün');
})();
