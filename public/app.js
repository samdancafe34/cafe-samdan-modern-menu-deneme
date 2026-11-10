(function () {
  'use strict';

  const app = document.getElementById('app');
  const CACHE_KEY = 'samdan-menu-cache-v1';
  let S = { cafe: {}, categories: [], products: [] };
  let loaded = false;
  let lang = 'tr';
  let spy = null;
  const ui = { q: '', open: null };

  // Eski sitenin kategori adreslerini (QR kodlarda kalmış olabilir) yeni menüdeki kategoriye bağlar.
  const OLD_SLUGS = {
    'kahvaltilar-breakfasts': 'Kahvaltılar', 'menemen-cesitleri-menemen-types': 'Menemenler', 'corbalar-soups': 'Çorbalar',
    'tostlar-toasts': 'Tostlar', 'hamburgerler-hamburgers': 'Hamburgerler', 'ara-sicaklar-hot-appetizers': 'Ara Sıcaklar',
    'wraplar-durumler-wraps-rolls': 'Wrap & Dürümler', 'gozlemeler-pancakes': 'Gözlemeler', 'makarnalar-pastas': 'Makarnalar',
    'ana-yemekler-main-courses': 'Ana Yemekler', 'kebaplar-kebab': 'Kebaplar', 'steakler-steaks': 'Steakler', 'pizza': 'Pizza',
    'balik-fish': 'Balık', 'salatalar-salads': 'Salatalar', 'pasta-tatli-cake-dessert': 'Pasta & Tatlılar',
    'sicak-icecekler-hot-drinks': 'Sıcak İçecekler', 'soguk-icecekler-cold-drinks': 'Soğuk İçecekler',
    'al-fakher-nargile-al-fakher-hookah': 'Al Fakher Nargile', 'nakhla-nargile-nakhla-hookah': 'Nakhla Nargile',
    'adalya-nargile': 'Adalya Nargile', 'nargile-ekstra': 'Nargile Ekstra', 'marpuc': 'Nargile Ekstra', 'kafa-degisimi': 'Nargile Ekstra'
  };

  const ALLERGENS = {
    gluten: { tr: 'Gluten', en: 'Gluten', ar: 'الغلوتين' }, milk: { tr: 'Süt', en: 'Milk', ar: 'الحليب' },
    egg: { tr: 'Yumurta', en: 'Egg', ar: 'البيض' }, nuts: { tr: 'Sert kabuklu yemiş', en: 'Tree nuts', ar: 'المكسرات' },
    peanut: { tr: 'Yer fıstığı', en: 'Peanut', ar: 'الفول السوداني' }, sesame: { tr: 'Susam', en: 'Sesame', ar: 'السمسم' },
    soy: { tr: 'Soya', en: 'Soy', ar: 'الصويا' }, fish: { tr: 'Balık', en: 'Fish', ar: 'السمك' },
    celery: { tr: 'Kereviz', en: 'Celery', ar: 'الكرفس' }, mustard: { tr: 'Hardal', en: 'Mustard', ar: 'الخردل' }
  };

  // p/c/f: kartlardaki kısa harfler (dile göre). Karbonhidrat: TR "K", EN "C".
  const UI = {
    tr: { search: 'Menüde ara', menu: 'Menü', pick: 'Dilinizi seçin', cats: 'Kategoriler', soldOut: 'Tükendi', back: 'Geri', close: 'Kapat', zoom: 'Fotoğrafı büyüt', kcal: 'kcal', p: 'P', c: 'K', f: 'Y', legend: 'P Protein · K Karbonhidrat · Y Yağ · porsiyon başına', allergens: 'Alerjenler', none: 'Sonuç bulunamadı.', empty: 'Menü yükleniyor…', fail: 'Menü şu an yüklenemedi. Lütfen sayfayı yenileyin.', vat: 'Fiyatlara KDV dahildir.', priceDate: 'Fiyat değişim tarihi', items: 'ürün' },
    en: { search: 'Search the menu', menu: 'Menu', pick: 'Choose your language', cats: 'Categories', soldOut: 'Sold out', back: 'Back', close: 'Close', zoom: 'Enlarge photo', kcal: 'kcal', p: 'P', c: 'C', f: 'F', legend: 'P Protein · C Carbs · F Fat · per portion', allergens: 'Allergens', none: 'No results.', empty: 'Loading the menu…', fail: 'The menu could not be loaded. Please refresh the page.', vat: 'Prices include VAT.', priceDate: 'Prices last changed', items: 'items' },
    ar: { search: 'ابحث في القائمة', menu: 'القائمة', pick: 'اختر لغتك', cats: 'الفئات', soldOut: 'نفد', back: 'رجوع', close: 'إغلاق', zoom: 'تكبير الصورة', kcal: 'سعرة', p: 'ب', c: 'ك', f: 'د', legend: 'ب بروتين · ك كربوهيدرات · د دهون · لكل حصة', allergens: 'مسببات الحساسية', none: 'لا توجد نتائج.', empty: 'جارٍ تحميل القائمة…', fail: 'تعذّر تحميل القائمة. يرجى تحديث الصفحة.', vat: 'الأسعار شاملة ضريبة القيمة المضافة.', priceDate: 'تاريخ تغيير الأسعار', items: 'صنف' }
  };

  // ---------- yardımcılar ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loc = () => (lang === 'tr' ? 'tr-TR' : 'en-US');
  const fold = (s) => String(s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '');

  function L(o) {
    if (!o) return '';
    if (lang === 'ar') return o.ar || o.en || o.tr || '';
    if (lang === 'en') return o.en || o.tr || '';
    return o.tr || o.en || '';
  }
  const fmtPrice = (v) => new Intl.NumberFormat(loc(), { maximumFractionDigits: 2 }).format(v) + ' ₺';
  const fmtNum = (v) => new Intl.NumberFormat(loc(), { maximumFractionDigits: 1 }).format(v);
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const hasNutri = (p) => !!p.nutri && (p.nutri.kcal != null || p.nutri.protein != null || p.nutri.fat != null || p.nutri.carb != null);
  const photoUrl = (p, w) => (p.photo.indexOf('data:') === 0 ? p.photo : p.photo + (p.photo.indexOf('?') >= 0 ? '&' : '?') + 'w=' + w);

  const catById = (id) => S.categories.filter((c) => c.id === id)[0];
  const itemsOf = (c) => S.products.filter((p) => p.cat === c.id);
  const visibleCats = () => S.categories.filter((c) => itemsOf(c).length > 0);

  // ---------- parçalar ----------
  const LOGO = '<svg viewBox="0 0 32 44" aria-hidden="true"><defs><linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E9902B"/><stop offset="1" stop-color="#FFD98A"/></linearGradient></defs><path d="M16 1c3.4 4.4 5.6 7.6 5.6 11a5.6 5.6 0 0 1-11.2 0C10.4 8.6 12.6 5.4 16 1z" fill="url(#fl)"/><rect x="14.6" y="17" width="2.8" height="4" rx="1" class="lg-w"/><rect x="10" y="21" width="12" height="14" rx="3" class="lg-w"/><path d="M4 37h24l-3 6H7z" class="lg-b"/></svg>';
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
  const CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  const backBtn = (to) => '<button type="button" class="back" data-act="nav" data-to="' + esc(to) + '" aria-label="' + esc(UI[lang].back) + '">' + ARROW + '</button>';
  const brandName = () => esc(S.cafe.name || 'Cafe Şamdan');

  function macrosHTML(p) {
    if (!hasNutri(p)) return '';
    const u = UI[lang];
    const n = p.nutri;
    const chip = (cls, label, v, unit) => (v == null ? '' : '<span class="mc ' + cls + '"><i>' + esc(label) + '</i><b>' + fmtNum(v) + '</b>' + (unit ? '<small>' + unit + '</small>' : '') + '</span>');
    return '<span class="macros">' +
      (n.kcal != null ? '<span class="mc kc"><b>' + fmtNum(n.kcal) + '</b><small>' + esc(u.kcal) + '</small></span>' : '') +
      chip('pr', u.p, n.protein, 'g') + chip('cb', u.c, n.carb, 'g') + chip('ft', u.f, n.fat, 'g') + '</span>';
  }

  function itemHTML(p, showCat) {
    const u = UI[lang];
    const open = ui.open === p.id;
    const desc = L(p.desc);
    const algs = (p.allergens || []).map((k) => ALLERGENS[k]).filter(Boolean);
    const more = !!desc || !!p.photo || algs.length > 0 || hasNutri(p);
    let cat = '';
    if (showCat) { const c = catById(p.cat); if (c) cat = '<span class="item-cat">' + esc(L(c.name)) + '</span>'; }
    const thumb = p.photo && !open ? '<button type="button" class="thumbbtn" data-act="zoom" data-id="' + esc(p.id) + '" aria-label="' + esc(u.zoom) + '"><img class="thumb" src="' + esc(photoUrl(p, 240)) + '" alt="" loading="lazy"></button>' : '';
    let detail = '';
    if (open) {
      detail = '<div class="detail">' +
        (desc ? '<p class="desc">' + esc(desc) + '</p>' : '') +
        (algs.length ? '<div class="alg"><span class="alg-t">' + esc(u.allergens) + '</span>' + algs.map((a) => '<span class="tag">' + esc(a[lang] || a.en) + '</span>').join('') + '</div>' : '') +
        (p.photo ? '<button type="button" class="photobtn" data-act="zoom" data-id="' + esc(p.id) + '" aria-label="' + esc(u.zoom) + '"><img class="photo" src="' + esc(photoUrl(p, 900)) + '" alt="' + esc(L(p.name)) + '" loading="lazy"></button>' : '') +
        (hasNutri(p) ? '<p class="legend">' + esc(u.legend) + '</p>' : '') +
        '</div>';
    }
    return '<article class="item' + (p.soldOut ? ' sold' : '') + (open ? ' open' : '') + '">' +
      '<div class="row"><button type="button" class="item-main" data-act="toggle" data-id="' + esc(p.id) + '" aria-expanded="' + open + '">' +
      '<span class="item-top"><span class="item-name">' + esc(L(p.name)) + '</span>' +
      (p.price != null ? '<span class="price">' + esc(fmtPrice(p.price)) + '</span>' : '') + '</span>' +
      cat + (p.soldOut ? '<span class="tag warn">' + esc(u.soldOut) + '</span>' : '') +
      macrosHTML(p) + (desc && !open ? '<span class="item-desc">' + esc(desc) + '</span>' : '') + (more ? CHEV : '') + '</button>' + thumb + '</div>' + detail + '</article>';
  }

  function footerHTML() {
    const u = UI[lang];
    const c = S.cafe || {};
    return '<footer class="foot"><p>' + esc(u.vat) + (c.priceDate ? ' ' + esc(u.priceDate) + ': ' + esc(fmtDate(c.priceDate)) : '') + '</p>' +
      (c.address ? '<p>' + esc(c.address) + '</p>' : '') + (c.phone ? '<p dir="ltr">' + esc(c.phone) + '</p>' : '') + '</footer>';
  }

  // ---------- sayfalar ----------
  function langPage() {
    const opts = [['tr', 'Türkçe', 'TR'], ['en', 'English', 'EN'], ['ar', 'العربية', 'AR']].map((o) =>
      '<button type="button" class="langbtn" data-act="lang" data-v="' + o[0] + '"><span>' + o[1] + '</span><em>' + o[2] + '</em></button>').join('');
    return '<section class="page lang-page"><div class="glow" aria-hidden="true"></div>' +
      '<div class="lp-brand">' + LOGO + '<h1>' + brandName() + '</h1></div>' +
      '<p class="lp-pick">Dilinizi seçin <span>·</span> Choose your language <span>·</span> اختر لغتك</p>' +
      '<div class="langs">' + opts + '</div></section>';
  }

  function catsBody() {
    const u = UI[lang];
    const q = ui.q.trim().toLocaleLowerCase(loc());
    if (!S.products.length) return '<p class="none">' + esc(loaded ? u.fail : u.empty) + '</p>';
    if (q) {
      const hits = S.products.filter((p) => [p.name, p.desc].map((o) => (o ? [o.tr, o.en, o.ar].join(' ') : '')).join(' ').toLocaleLowerCase(loc()).indexOf(q) >= 0);
      return hits.length ? '<div class="items">' + hits.map((p) => itemHTML(p, true)).join('') + '</div>' : '<p class="none">' + esc(u.none) + '</p>';
    }
    return '<div class="catgrid">' + visibleCats().map((c) =>
      '<button type="button" class="catcard" data-act="nav" data-to="k-' + esc(c.id) + '"><span class="cn">' + esc(L(c.name)) + '</span><span class="cc">' + itemsOf(c).length + ' ' + esc(u.items) + '</span></button>').join('') + '</div>';
  }
  function catsPage() {
    const u = UI[lang];
    return '<section class="page"><header class="bar">' + backBtn('lang') + '<div class="bar-title"><h1>' + brandName() + '</h1><p>' + esc(u.cats) + '</p></div></header>' +
      '<div class="search">' + SEARCH_ICON + '<input id="q" type="search" autocomplete="off" placeholder="' + esc(u.search) + '" aria-label="' + esc(u.search) + '" value="' + esc(ui.q) + '"></div>' +
      '<div id="body">' + catsBody() + '</div>' + footerHTML() + '</section>';
  }
  function catPage(c) {
    return '<section class="page"><header class="bar">' + backBtn('menu') + '<div class="bar-title"><h1>' + esc(L(c.name)) + '</h1><p>' + itemsOf(c).length + ' ' + esc(UI[lang].items) + '</p></div></header>' +
      '<div class="items">' + itemsOf(c).map((p) => itemHTML(p, false)).join('') + '</div>' + footerHTML() + '</section>';
  }

  // ---------- yönlendirme ----------
  let chosen = false;
  const route = () => {
    const h = location.hash.replace(/^#/, '');
    if (h.indexOf('k-') === 0) { const c = catById(h.slice(2)); if (c) return { v: 'cat', c: c }; }
    if (h === 'lang') return { v: 'lang' };
    if (h === 'menu' || chosen) return { v: 'cats' };
    return { v: 'lang' };
  };
  let lastKey = '';
  function render(keepScroll) {
    const r = route();
    document.documentElement.setAttribute('lang', lang);
    app.setAttribute('lang', lang);
    app.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    app.innerHTML = r.v === 'lang' ? langPage() : r.v === 'cat' ? catPage(r.c) : catsPage();
    app.setAttribute('data-view', r.v);
    const key = r.v + (r.c ? r.c.id : '');
    if (!keepScroll && key !== lastKey) window.scrollTo(0, 0);
    lastKey = key;
  }

  // ---------- olaylar ----------
  function zoom(id) {
    const p = S.products.filter((x) => x.id === id)[0];
    if (!p || !p.photo) return;
    const u = UI[lang];
    const el = document.createElement('div');
    el.className = 'lightbox';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<button type="button" class="lb-close" data-act="unzoom" aria-label="' + esc(u.close) + '">×</button><figure><img src="' + esc(photoUrl(p, 900)) + '" alt="' + esc(L(p.name)) + '"><figcaption>' + esc(L(p.name)) + '</figcaption></figure>';
    document.body.appendChild(el);
    document.body.classList.add('noscroll');
  }
  function unzoom() {
    const el = $('.lightbox');
    if (el) el.remove();
    document.body.classList.remove('noscroll');
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') unzoom(); });
  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('lightbox')) return unzoom();
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const a = t.getAttribute('data-act');
    const id = t.getAttribute('data-id');
    if (a === 'lang') {
      lang = t.getAttribute('data-v');
      chosen = true;
      try { localStorage.setItem('samdan-lang', lang); sessionStorage.setItem('samdan-chosen', '1'); } catch (x) { /* yoksay */ }
      location.hash = 'menu';
      render();
    } else if (a === 'nav') {
      if (t.classList.contains('back') && ui.q && $('#q')) {
        ui.q = ''; ui.open = null;
        $('#q').value = '';
        $('#body').innerHTML = catsBody();
        return;
      }
      ui.open = null;
      if (t.getAttribute('data-to') === 'menu') ui.q = '';
      location.hash = t.getAttribute('data-to');
    } else if (a === 'toggle') {
      ui.open = ui.open === id ? null : id;
      render(true);
      const q = $('#q'); if (q && ui.q) { q.focus(); }
    } else if (a === 'zoom') zoom(id);
    else if (a === 'unzoom') unzoom();
  });
  window.addEventListener('hashchange', () => { unzoom(); render(); });
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'q') { ui.q = e.target.value; ui.open = null; $('#body').innerHTML = catsBody(); }
  });

  // ---------- başlangıç ----------
  function apply(data) {
    if (!data || !data.products || !data.products.length) return false;
    S = data;
    return true;
  }
  function goToOldSlug() {
    const seg = location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
    const name = OLD_SLUGS[seg];
    if (!name || location.hash) return;
    const c = S.categories.filter((x) => fold(x.name.tr) === fold(name))[0];
    if (c) { chosen = true; location.hash = 'k-' + c.id; }
  }
  async function load() {
    let fresh = null;
    try {
      const r = await fetch('/api/menu', { headers: { Accept: 'application/json' } });
      if (r.ok) fresh = await r.json();
    } catch (e) { /* ağ yok */ }
    if (!apply(fresh)) {
      try {
        const r = await fetch('/fallback.json');
        if (r.ok) apply(await r.json());
      } catch (e) { /* yoksay */ }
    } else {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); } catch (e) { /* yoksay */ }
    }
    loaded = true;
    goToOldSlug();
    render(true);
  }
  function init() {
    try {
      const saved = localStorage.getItem('samdan-lang');
      if (saved === 'tr' || saved === 'en' || saved === 'ar') lang = saved;
      else {
        const nl = (navigator.language || 'tr').slice(0, 2).toLowerCase();
        lang = nl === 'tr' ? 'tr' : nl === 'ar' ? 'ar' : 'en';
      }
      chosen = sessionStorage.getItem('samdan-chosen') === '1';
    } catch (e) { /* yoksay */ }
    try { apply(JSON.parse(localStorage.getItem(CACHE_KEY))); } catch (e) { /* yoksay */ }
    render();
    load();
  }
  init();
})();
