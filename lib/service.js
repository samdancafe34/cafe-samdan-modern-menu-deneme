'use strict';
const getConfig = require('./config');
const { fetchText } = require('./http');
const { buildMenu } = require('./menu');
const { listFolder, indexFiles } = require('./drive');

// Menüyü E-Tablo'dan üretir. Başarısız olursa son bilinen geçerli menüyü (data/fallback.json) döndürür.
async function getMenu(fallback) {
  const cfg = getConfig();
  const generatedAt = new Date().toISOString();
  const optional = (url) => fetchText(url, cfg.timeoutMs).catch((e) => ({ __err: e.message }));
  try {
    const [products, cats, settings] = await Promise.all([
      fetchText(cfg.productsUrl, cfg.timeoutMs), optional(cfg.categoriesUrl), optional(cfg.settingsUrl)
    ]);
    const extra = [];
    let photoIndex = null;
    let photos = 'kapalı';
    if (cfg.apiKey && cfg.folderId) {
      try { photoIndex = indexFiles(await listFolder(cfg)); photos = 'açık'; }
      catch (e) { extra.push({ level: 'hata', where: 'Fotoğraflar', msg: 'Drive klasörü okunamadı: ' + e.message }); photos = 'hata'; }
    }
    const r = buildMenu(products, cats.__err ? null : cats, settings.__err ? null : settings, photoIndex);
    if (cats.__err) extra.push({ level: 'hata', where: 'Kategoriler', msg: 'Sekme okunamadı (' + cats.__err + '), kategoriler Ürünler tablosundan çıkarıldı.' });
    if (settings.__err) extra.push({ level: 'hata', where: 'Ayarlar', msg: 'Sekme okunamadı (' + settings.__err + '), önceki kafe bilgileri kullanıldı.' });
    if (settings.__err || !r.menu.cafe.name) r.menu.cafe = Object.assign({}, fallback.cafe, r.menu.cafe.name ? r.menu.cafe : {});
    return {
      ok: true,
      body: Object.assign({}, r.menu, {
        meta: { source: 'sheet', generatedAt, photos, counts: r.counts, issues: extra.concat(r.issues), lists: r.lists }
      })
    };
  } catch (e) {
    return {
      ok: false,
      body: Object.assign({}, fallback, {
        meta: { source: 'fallback', generatedAt, error: String(e && e.message || e), photos: 'kapalı', counts: { products: fallback.products.length, categories: fallback.categories.length }, issues: [{ level: 'hata', where: 'Menü', msg: 'E-Tablo okunamadı, son kayıtlı menü gösteriliyor: ' + (e && e.message || e) }], lists: { noPrice: [], noNutri: [], noPhoto: [] } }
      })
    };
  }
}
module.exports = { getMenu };
