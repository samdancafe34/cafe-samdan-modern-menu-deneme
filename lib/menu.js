'use strict';
// E-Tablo (CSV) satırlarından menü verisi üretir. Hatalı satırı atlar, nedenini "issues" listesine yazar; asla çökmez.
const { parseCSV } = require('./csv');
const { fold, parseNumber, truthy, parseDate } = require('./text');
const { baseName } = require('./drive');

const ALLERGENS = {
  gluten: 'gluten', sut: 'milk', milk: 'milk', yumurta: 'egg', egg: 'egg',
  kuruyemis: 'nuts', sertkabukluyemis: 'nuts', nuts: 'nuts', treenuts: 'nuts',
  yerfistigi: 'peanut', peanut: 'peanut', susam: 'sesame', sesame: 'sesame',
  soya: 'soy', soy: 'soy', balik: 'fish', fish: 'fish', kereviz: 'celery', celery: 'celery',
  hardal: 'mustard', mustard: 'mustard'
};

// başlık (fold edilmiş) -> alan adı; başlığın başı eşleşirse yeter
const PRODUCT_COLS = [
  ['urunaditr', 'nameTr'], ['urunadien', 'nameEn'], ['urunadiar', 'nameAr'], ['urunadi', 'nameTr'],
  ['aciklamatr', 'descTr'], ['aciklamaen', 'descEn'], ['aciklamaar', 'descAr'], ['aciklama', 'descTr'],
  ['kategori', 'cat'], ['sira', 'order'], ['fiyat', 'price'], ['protein', 'protein'],
  ['karbonhidrat', 'carb'], ['yag', 'fat'], ['enerji', 'kcal'], ['alerjen', 'allergens'],
  ['fotograf', 'photoFile'], ['tukendi', 'soldOut'], ['gizli', 'hidden']
];
const CAT_COLS = [
  ['kategoritr', 'nameTr'], ['kategorien', 'nameEn'], ['kategoriar', 'nameAr'], ['kategori', 'nameTr'],
  ['sira', 'order'], ['gizli', 'hidden']
];

function mapHeader(row, defs) {
  const idx = {};
  row.forEach((h, i) => {
    const f = fold(h);
    if (!f) return;
    for (const [prefix, key] of defs) {
      if (f.indexOf(prefix) === 0 && idx[key] === undefined) { idx[key] = i; break; }
    }
  });
  return idx;
}
const cell = (row, idx, key) => (idx[key] === undefined ? '' : String(row[idx[key]] == null ? '' : row[idx[key]]).trim());
const blank = (row) => row.every((c) => String(c || '').trim() === '');

function uniqueId(base, used) {
  let id = base || 'x';
  let n = 2;
  while (used.has(id)) id = base + '-' + n++;
  used.add(id);
  return id;
}

function buildMenu(productsCsv, categoriesCsv, settingsCsv, photoIndex) {
  const issues = [];
  const add = (level, where, msg) => issues.push({ level, where, msg });

  // ---- ayarlar ----
  const cafe = { name: '', address: '', phone: '', priceDate: '' };
  if (settingsCsv != null) {
    parseCSV(settingsCsv).slice(1).forEach((r) => {
      const k = fold(r[0]);
      const v = String(r[1] == null ? '' : r[1]).trim();
      if (k === 'kafeadi') cafe.name = v;
      else if (k === 'adres') cafe.address = v;
      else if (k === 'telefon') cafe.phone = v;
      else if (k === 'fiyattarihi') {
        const d = parseDate(v);
        if (v && !d) add('uyarı', 'Ayarlar', 'Fiyat tarihi anlaşılamadı: "' + v + '" (YYYY-AA-GG yaz)');
        cafe.priceDate = d || '';
      }
    });
  }

  // ---- ürün tablosu ----
  const prows = parseCSV(productsCsv);
  if (!prows.length) throw new Error('Ürünler tablosu boş geldi.');
  const pidx = mapHeader(prows[0], PRODUCT_COLS);
  ['cat', 'nameTr'].forEach((k) => {
    if (pidx[k] === undefined) throw new Error('Ürünler tablosunda "' + (k === 'cat' ? 'Kategori' : 'Ürün Adı (TR)') + '" başlığı bulunamadı. Başlık satırını değiştirmiş olabilirsin.');
  });

  // ---- kategori tablosu ----
  const catList = [];
  const catByFold = new Map();
  const catIds = new Set();
  const addCat = (nameTr, nameEn, nameAr, hidden, order, row) => {
    const f = fold(nameTr);
    if (!f) return;
    if (catByFold.has(f)) { add('uyarı', 'Kategoriler satır ' + row, '"' + nameTr + '" iki kez yazılmış, ikincisi yok sayıldı.'); return; }
    const c = { id: uniqueId('c-' + f, catIds), name: { tr: nameTr, en: nameEn, ar: nameAr }, hidden, order, row, _f: f };
    catByFold.set(f, c);
    catList.push(c);
  };
  let catsFromSheet = false;
  if (categoriesCsv != null) {
    const crows = parseCSV(categoriesCsv);
    if (crows.length) {
      const cidx = mapHeader(crows[0], CAT_COLS);
      if (cidx.nameTr === undefined) add('uyarı', 'Kategoriler', 'Başlık bulunamadı, kategoriler Ürünler tablosundan çıkarıldı.');
      else {
        catsFromSheet = true;
        crows.slice(1).forEach((r, i) => {
          if (blank(r)) return;
          const o = parseNumber(cell(r, cidx, 'order'));
          addCat(cell(r, cidx, 'nameTr'), cell(r, cidx, 'nameEn'), cell(r, cidx, 'nameAr'), truthy(cell(r, cidx, 'hidden')), o.value, i + 2);
        });
      }
    }
  }

  // ---- ürünler ----
  const products = [];
  const usedIds = new Set();
  const lists = { noPrice: [], noNutri: [], noPhoto: [] };
  let skipped = 0;
  let hiddenCount = 0;
  prows.slice(1).forEach((r, i) => {
    if (blank(r)) return;
    const row = i + 2;
    const nameTr = cell(r, pidx, 'nameTr');
    const catName = cell(r, pidx, 'cat');
    const where = 'Ürünler satır ' + row + (nameTr ? ' (' + nameTr + ')' : '');
    if (!nameTr) { add('hata', where, 'Ürün adı (TR) boş, satır atlandı.'); skipped++; return; }
    if (!catName) { add('hata', where, 'Kategori boş, ürün menüye alınmadı.'); skipped++; return; }
    let cat = catByFold.get(fold(catName));
    if (!cat) {
      if (catsFromSheet) { add('hata', where, 'Kategori "' + catName + '" Kategoriler sekmesinde yok, ürün menüye alınmadı. Listeden seç.'); skipped++; return; }
      addCat(catName, '', '', false, null, 0);
      cat = catByFold.get(fold(catName));
    }
    const num = (key, label) => {
      const raw = cell(r, pidx, key);
      const p = parseNumber(raw);
      if (p.error) add('hata', where, label + ' "' + raw + '" ' + p.error + ', boş sayıldı.');
      return p.value;
    };
    const price = num('price', 'Fiyat');
    const protein = num('protein', 'Protein');
    const carb = num('carb', 'Karbonhidrat');
    const fat = num('fat', 'Yağ');
    let kcal = num('kcal', 'Enerji');
    if (kcal == null && (protein != null || carb != null || fat != null)) kcal = Math.round(4 * (protein || 0) + 4 * (carb || 0) + 9 * (fat || 0));
    const nutri = [protein, carb, fat, kcal].some((v) => v != null) ? { kcal, protein, fat, carb } : null;
    const allergens = [];
    cell(r, pidx, 'allergens').split(/[,;/]+/).map((s) => s.trim()).filter(Boolean).forEach((a) => {
      const k = ALLERGENS[fold(a)];
      if (!k) add('uyarı', where, 'Bilinmeyen alerjen "' + a + '", yok sayıldı.');
      else if (allergens.indexOf(k) < 0) allergens.push(k);
    });
    const hidden = truthy(cell(r, pidx, 'hidden'));
    if (hidden) { hiddenCount++; return; }

    let photo = null;
    if (photoIndex) {
      const file = cell(r, pidx, 'photoFile');
      const key = fold(file ? baseName(file) : nameTr);
      const hit = photoIndex.get(key);
      if (hit) photo = '/api/photo?id=' + encodeURIComponent(hit.id) + '&v=' + hit.v;
      else if (file) add('uyarı', where, 'Fotoğraf dosyası "' + file + '" Drive klasöründe bulunamadı.');
    }
    const o = parseNumber(cell(r, pidx, 'order')).value;
    products.push({
      id: uniqueId('p-' + fold(nameTr), usedIds), cat: cat.id,
      name: { tr: nameTr, en: cell(r, pidx, 'nameEn'), ar: cell(r, pidx, 'nameAr') },
      desc: { tr: cell(r, pidx, 'descTr'), en: cell(r, pidx, 'descEn'), ar: cell(r, pidx, 'descAr') },
      price, photo, nutri, allergens, soldOut: truthy(cell(r, pidx, 'soldOut')),
      _o: o == null ? Infinity : o, _i: i
    });
    if (price == null) lists.noPrice.push(nameTr);
    if (!nutri) lists.noNutri.push(nameTr);
    if (!photo) lists.noPhoto.push(nameTr);
  });

  // ---- sıralama ve gizli kategoriler ----
  catList.sort((a, b) => (a.order == null ? Infinity : a.order) - (b.order == null ? Infinity : b.order) || a.row - b.row);
  const catOrder = new Map(catList.map((c, i) => [c.id, i]));
  products.sort((a, b) => catOrder.get(a.cat) - catOrder.get(b.cat) || a._o - b._o || a._i - b._i);
  const visibleCats = catList.filter((c) => !c.hidden);
  const visibleIds = new Set(visibleCats.map((c) => c.id));
  const outProducts = products.filter((p) => visibleIds.has(p.cat)).map((p) => { const q = Object.assign({}, p); delete q._o; delete q._i; return q; });
  const outCats = visibleCats.filter((c) => outProducts.some((p) => p.cat === c.id))
    .map((c) => ({ id: c.id, name: c.name, hidden: false }));
  if (!outProducts.length) throw new Error('Menüde gösterilecek ürün kalmadı.');

  return {
    menu: { cafe, categories: outCats, products: outProducts },
    issues,
    lists,
    counts: { products: outProducts.length, categories: outCats.length, skipped, hidden: hiddenCount }
  };
}

module.exports = { buildMenu };
