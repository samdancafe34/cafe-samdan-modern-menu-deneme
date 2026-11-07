'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mock = require('./mockfetch');
const { parseCSV } = require('../lib/csv');
const { parseNumber, fold } = require('../lib/text');
const { buildMenu } = require('../lib/menu');
const { indexFiles, resetCache } = require('../lib/drive');
const { getMenu } = require('../lib/service');
const fallback = require('../public/fallback.json');

const FX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', n + '.csv'), 'utf8');
let pass = 0;
const failures = [];
async function t(name, fn) {
  try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { failures.push(name); console.log('FAIL ' + name + '\n     ' + (e.message || e).split('\n')[0]); }
}
const build = (p, c, s, idx) => buildMenu(p == null ? FX('urunler') : p, c === undefined ? FX('kategoriler') : c, s === undefined ? FX('ayarlar') : s, idx);

// CSV'de belirli sütunlardaki sayıları dönüştürür (Türkçe biçim denemesi için)
function mapCols(csv, cols, fn) {
  const rows = parseCSV(csv);
  const q = (v) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
  return rows.map((r, i) => (i === 0 ? r : r.map((v, j) => (cols.indexOf(j) >= 0 && v !== '' ? fn(v) : v)))).map((r) => r.map(q).join(',')).join('\n');
}
const NUMCOLS = [8, 9, 10, 11, 12];

(async () => {
  await t('csv: tırnak, çift tırnak, satır içi satır sonu, BOM, CRLF', () => {
    const r = parseCSV('﻿a,b\r\n"x,1","he said ""hi"""\r\n"line1\nline2",z');
    assert.deepStrictEqual(r, [['a', 'b'], ['x,1', 'he said "hi"'], ['line1\nline2', 'z']]);
  });
  await t('csv: boş metin ve sonda satır sonu olmayan dosya', () => {
    assert.deepStrictEqual(parseCSV(''), []);
    assert.deepStrictEqual(parseCSV('a,b'), [['a', 'b']]);
  });
  await t('sayı: Türkçe ve İngilizce biçimler', () => {
    const cases = { '12,5': 12.5, '12.5': 12.5, '1.200': 1200, '1.200,50': 1200.5, '1,200.50': 1200.5, '₺12': 12, '12 TL': 12, '0.125': 0.125, '1230': 1230, '': null };
    Object.keys(cases).forEach((k) => assert.strictEqual(parseNumber(k).value, cases[k], k));
    assert.strictEqual(parseNumber('abc').error, 'sayı değil');
    assert.strictEqual(parseNumber('-3').error, 'negatif');
  });
  await t('fold: Türkçe harf, büyük/küçük harf, noktalama', () => {
    assert.strictEqual(fold('Kuzu Şiş'), fold('kuzu-sis'));
    assert.strictEqual(fold('İçli Köfte'), fold('icli kofte'));
    assert.strictEqual(fold('ADANA KEBAP'), fold('Adana Kebap'));
  });

  const base = build();
  await t('gerçek şablon: 22 kategori, 152 ürün, sorunsuz', () => {
    assert.strictEqual(base.menu.categories.length, 22);
    assert.strictEqual(base.menu.products.length, 152);
    assert.strictEqual(base.issues.length, 0, JSON.stringify(base.issues.slice(0, 3)));
  });
  await t('gerçek şablon: 131 ürün besinli, 6 ürün fiyatsız, kafe bilgisi', () => {
    assert.strictEqual(base.menu.products.filter((p) => p.nutri).length, 131);
    assert.strictEqual(base.lists.noPrice.length, 6);
    assert.strictEqual(base.menu.cafe.name, 'Cafe Şamdan');
    assert.strictEqual(base.menu.cafe.priceDate, '2026-04-11');
  });
  await t('gerçek şablon: kalori, protein, yağ, karbonhidrat doğru sütunda', () => {
    const p = base.menu.products.find((x) => x.name.tr === 'Kahvaltı Tabağı');
    assert.deepStrictEqual(p.nutri, { kcal: 530, protein: 25, fat: 30, carb: 40 });
    assert.strictEqual(p.price, 480);
  });
  await t('gerçek şablon: kategori ve ürün sırası korunuyor', () => {
    assert.strictEqual(base.menu.categories[0].name.tr, 'Kahvaltılar');
    assert.strictEqual(base.menu.categories[21].name.tr, 'Nargile Ekstra');
    assert.strictEqual(base.menu.products[0].name.tr, 'Kahvaltı Tabağı');
  });
  await t('Türkçe biçim (12,5 ve 1.200): sonuç aynı', () => {
    const tr = mapCols(FX('urunler'), NUMCOLS, (v) => v.replace('.', ','));
    assert.deepStrictEqual(build(tr).menu, base.menu);
    const thou = mapCols(FX('urunler'), [8], (v) => (/^\d{4,}$/.test(v) ? v.slice(0, -3) + '.' + v.slice(-3) : v));
    assert.deepStrictEqual(build(thou).menu.products.map((p) => p.price), base.menu.products.map((p) => p.price));
  });
  await t('kalori boşsa makrolardan hesaplanır', () => {
    const csv = mapCols(FX('urunler'), [12], () => '');
    const p = build(csv).menu.products.find((x) => x.name.tr === 'Sucuklu Menemen');
    assert.strictEqual(p.nutri.kcal, 537); // 4*33 + 4*10 + 9*40,5 = 536,5 -> 537
  });

  // ---- bozuk veri: site çökmemeli, sorun listesine yazmalı ----
  const rows = parseCSV(FX('urunler'));
  const H = rows[0];
  const csvOf = (rs) => rs.map((r) => r.map((v) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)).join(',')).join('\n');
  const blankRow = () => H.map(() => '');
  const mk = (over) => { const r = blankRow(); Object.keys(over).forEach((k) => { r[H.indexOf(k)] = over[k]; }); return r; };
  const extra = (list) => csvOf(rows.concat(list));

  await t('bozuk: kategorisi olmayan / listede olmayan ürün atlanır, nedeni yazılır', () => {
    const r = build(extra([mk({ 'Ürün Adı (TR)': 'Yeni A', 'Fiyat (₺)': '10' }), mk({ Kategori: 'Yanlış Kategori', 'Ürün Adı (TR)': 'Yeni B', 'Fiyat (₺)': '10' })]));
    assert.strictEqual(r.menu.products.length, 152);
    assert.strictEqual(r.issues.filter((i) => i.level === 'hata').length, 2);
    assert.ok(/Yeni A/.test(r.issues[0].where) && /Yeni B/.test(r.issues[1].where));
  });
  await t('bozuk: fiyat "abc" boş sayılır, "12 TL" okunur', () => {
    const r = build(extra([mk({ Kategori: 'Pizza', 'Ürün Adı (TR)': 'Deneme 1', 'Fiyat (₺)': 'abc' }), mk({ Kategori: 'Pizza', 'Ürün Adı (TR)': 'Deneme 2', 'Fiyat (₺)': '12 TL' })]));
    const a = r.menu.products.find((p) => p.name.tr === 'Deneme 1');
    const b = r.menu.products.find((p) => p.name.tr === 'Deneme 2');
    assert.strictEqual(a.price, null); assert.strictEqual(b.price, 12);
    assert.strictEqual(r.issues.length, 1);
  });
  await t('gizli ürün/kategori menüde görünmez, tükendi işaretlenir', () => {
    const r = build(extra([mk({ Kategori: 'Pizza', 'Ürün Adı (TR)': 'Gizli Pizza', Gizli: 'E' }), mk({ Kategori: 'Pizza', 'Ürün Adı (TR)': 'Bitti Pizza', Tükendi: 'e' })]));
    assert.ok(!r.menu.products.find((p) => p.name.tr === 'Gizli Pizza'));
    assert.strictEqual(r.menu.products.find((p) => p.name.tr === 'Bitti Pizza').soldOut, true);
    assert.strictEqual(r.counts.hidden, 1);
    const cats = FX('kategoriler').replace('Pizza,13,Pizza,البيتزا,', 'Pizza,13,Pizza,البيتزا,E');
    const r2 = build(null, cats);
    assert.ok(!r2.menu.categories.find((c) => c.name.tr === 'Pizza'));
    assert.ok(!r2.menu.products.find((p) => p.cat.indexOf('pizza') >= 0));
  });
  await t('boş satırlar ve aynı ada sahip iki ürün sorun çıkarmaz (id benzersiz)', () => {
    const r = build(extra([blankRow(), mk({ Kategori: 'Pizza', 'Ürün Adı (TR)': 'Çay' }), mk({ Kategori: 'Pizza', 'Ürün Adı (TR)': 'Çay' })]));
    const ids = r.menu.products.map((p) => p.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });
  await t('bozuk: sıra sütunu ürünü kategori içinde öne alır', () => {
    const r = build(extra([mk({ Kategori: 'Pizza', Sıra: '0', 'Ürün Adı (TR)': 'En Başa' })]));
    const pizza = r.menu.categories.find((c) => c.name.tr === 'Pizza').id;
    assert.strictEqual(r.menu.products.filter((p) => p.cat === pizza)[0].name.tr, 'En Başa');
  });
  await t('bozuk: başlık satırı değiştirilirse anlaşılır hata', () => {
    assert.throws(() => build(FX('urunler').replace('Kategori,', 'Tür,')), /Kategori/);
    assert.throws(() => build(''), /boş/);
  });
  await t('kategori sekmesi yoksa kategoriler üründen çıkarılır', () => {
    const r = build(null, null, null);
    assert.strictEqual(r.menu.categories.length, 22);
    assert.strictEqual(r.menu.products.length, 152);
  });
  await t('aynı kategori iki kez yazılırsa uyarı', () => {
    const r = build(null, FX('kategoriler').trim() + '\nPizza,99,Pizza,x,\n');
    assert.ok(r.issues.some((i) => /iki kez/.test(i.msg)));
  });
  await t('tarih biçimleri: GG.AA.YYYY okunur, bozuk tarih uyarı verir', () => {
    assert.strictEqual(build(null, undefined, FX('ayarlar').replace('2026-04-11', '05.11.2026')).menu.cafe.priceDate, '2026-11-05');
    assert.ok(build(null, undefined, FX('ayarlar').replace('2026-04-11', 'dün')).issues.some((i) => /tarih/i.test(i.msg)));
  });
  await t('alerjenler okunur, bilinmeyen alerjen uyarı verir', () => {
    const r = build(extra([mk({ Kategori: 'Pizza', 'Ürün Adı (TR)': 'Alerjenli', Alerjenler: 'Gluten, süt; Uzaylı' })]));
    const p = r.menu.products.find((x) => x.name.tr === 'Alerjenli');
    assert.deepStrictEqual(p.allergens, ['gluten', 'milk']);
    assert.ok(r.issues.some((i) => /Uzaylı/.test(i.msg)));
  });

  // ---- fotoğraf eşleştirme ----
  await t('fotoğraf: ada göre eşleşir (harf/Türkçe/uzantı farkı fark etmez), elle ad yazılabilir', () => {
    const idx = indexFiles(mock.state.driveFiles || (mock.reset(), mock.state.driveFiles));
    const r = build(extra([mk({ Kategori: 'Pizza', 'Ürün Adı (TR)': 'Başka Ad', 'Fotoğraf dosya adı (isteğe bağlı)': 'SUCUKLU-MENEMEN.PNG' }), mk({ Kategori: 'Pizza', 'Ürün Adı (TR)': 'Yok Foto', 'Fotoğraf dosya adı (isteğe bağlı)': 'olmayan.jpg' })]), undefined, undefined, idx);
    const by = (n) => r.menu.products.find((p) => p.name.tr === n);
    assert.ok(/^\/api\/photo\?id=FILE_KUZUSIS_DURUM_1&v=/.test(by('Kuzu Şiş Dürüm').photo));
    assert.ok(by('Adana Kebap').photo.indexOf('FILE_ADANA_KEBAP_0002') > 0);
    assert.ok(by('Sucuklu Menemen').photo.indexOf('FILE_SUCUKLU_MENEMEN_3') > 0);
    assert.ok(by('Başka Ad').photo.indexOf('FILE_SUCUKLU_MENEMEN_3') > 0);
    assert.strictEqual(by('Yok Foto').photo, null);
    assert.ok(r.issues.some((i) => /olmayan\.jpg/.test(i.msg)));
    assert.strictEqual(r.menu.products.filter((p) => p.photo).length, 4);
  });

  // ---- servis (ağ taklidi) ----
  await mock.install();
  process.env.GOOGLE_API_KEY = ''; process.env.DRIVE_FOLDER_ID = '';
  await t('servis: sorunsuz okuma, fotoğraf kapalıyken menü yine çalışır', async () => {
    const r = await getMenu(fallback);
    assert.ok(r.ok); assert.strictEqual(r.body.products.length, 152); assert.strictEqual(r.body.meta.photos, 'kapalı');
    assert.strictEqual(r.body.products.filter((p) => p.photo).length, 0);
  });
  await t('servis: E-Tablo okunamazsa kayıtlı yedek gösterilir', async () => {
    mock.state.fail = true;
    const r = await getMenu(fallback);
    assert.ok(!r.ok); assert.strictEqual(r.body.meta.source, 'fallback'); assert.strictEqual(r.body.products.length, 152);
    mock.state.fail = false;
  });
  await t('servis: tek sekme okunamazsa menü yine gelir, sorun listesine yazılır', async () => {
    mock.state.failTabs.settings = true;
    const r = await getMenu(fallback);
    assert.ok(r.ok); assert.strictEqual(r.body.cafe.name, 'Cafe Şamdan');
    assert.ok(r.body.meta.issues.some((i) => i.where === 'Ayarlar'));
    mock.state.failTabs = {};
  });
  await t('servis: ürün tablosu bozuksa (başlık yok) yedeğe düşer', async () => {
    const keep = mock.state.products;
    mock.state.products = keep.replace('Kategori,', 'Tür,');
    const r = await getMenu(fallback);
    assert.ok(!r.ok); assert.ok(/Kategori/.test(r.body.meta.error));
    mock.state.products = keep;
  });
  await t('servis: fotoğraf açıkken Drive eşleşmesi çalışır, Drive hatası menüyü bozmaz', async () => {
    process.env.GOOGLE_API_KEY = 'k'; process.env.DRIVE_FOLDER_ID = 'f'; resetCache();
    let r = await getMenu(fallback);
    assert.strictEqual(r.body.meta.photos, 'açık');
    assert.strictEqual(r.body.products.filter((p) => p.photo).length, 3);
    resetCache(); mock.state.drive = false;
    r = await getMenu(fallback);
    assert.ok(r.ok); assert.strictEqual(r.body.meta.photos, 'hata'); assert.strictEqual(r.body.products.length, 152);
    mock.state.drive = true; resetCache();
  });

  // ---- uç noktalar ----
  const fakeRes = () => { const r = { headers: {}, statusCode: 0, body: null, setHeader(k, v) { r.headers[k.toLowerCase()] = v; }, end(b) { r.body = b; } }; return r; };
  const menuApi = require('../api/menu');
  const photoApi = require('../api/photo');
  await t('/api/menu: JSON, önbellek başlığı, check olmadan sorun listesi sızmaz', async () => {
    const res = fakeRes();
    await menuApi({ url: '/api/menu' }, res);
    const j = JSON.parse(res.body);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(/s-maxage=300/.test(res.headers['cache-control']));
    assert.strictEqual(j.products.length, 152); assert.ok(!j.meta.issues);
    const res2 = fakeRes();
    await menuApi({ url: '/api/menu?check=1' }, res2);
    assert.ok(Array.isArray(JSON.parse(res2.body).meta.issues));
  });
  await t('/api/menu: yedekteyken kısa önbellek', async () => {
    mock.state.fail = true;
    const res = fakeRes();
    await menuApi({ url: '/api/menu' }, res);
    assert.ok(/s-maxage=60/.test(res.headers['cache-control']) && !/stale-while/.test(res.headers['cache-control']));
    mock.state.fail = false;
  });
  await t('/api/photo: geçersiz numara 400, klasörde olmayan 404, geçerli olan küçültülmüş JPEG', async () => {
    process.env.GOOGLE_API_KEY = 'k'; process.env.DRIVE_FOLDER_ID = 'f'; resetCache();
    let res = fakeRes(); await photoApi({ url: '/api/photo?id=../x' }, res); assert.strictEqual(res.statusCode, 400);
    res = fakeRes(); await photoApi({ url: '/api/photo?id=ZZZZZZZZZZZZZZZZZ' }, res); assert.strictEqual(res.statusCode, 404);
    res = fakeRes(); await photoApi({ url: '/api/photo?id=FILE_ADANA_KEBAP_0002&w=240' }, res);
    assert.strictEqual(res.statusCode, 200); assert.strictEqual(res.headers['content-type'], 'image/jpeg');
    assert.ok(/immutable/.test(res.headers['cache-control']));
    const meta = await require('sharp')(res.body).metadata();
    assert.strictEqual(meta.width, 240); assert.ok(res.body.length < 30000, 'boyut ' + res.body.length);
    res = fakeRes(); await photoApi({ url: '/api/photo?id=FILE_ADANA_KEBAP_0002&w=99999' }, res);
    assert.strictEqual((await require('sharp')(res.body).metadata()).width, 900);
  });
  await t('/api/photo: anahtar yoksa fotoğraf kapalı (404)', async () => {
    process.env.GOOGLE_API_KEY = ''; resetCache();
    const res = fakeRes(); await photoApi({ url: '/api/photo?id=FILE_ADANA_KEBAP_0002' }, res);
    assert.strictEqual(res.statusCode, 404);
  });

  console.log('\n' + pass + ' geçti, ' + failures.length + ' kaldı');
  process.exit(failures.length ? 1 : 0);
})();
