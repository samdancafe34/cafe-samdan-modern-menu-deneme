
(function () {
  'use strict';

  const app = document.getElementById('app');
  const CACHE_KEY = 'samdan-menu-cache-v2';
  let S = { cafe: {}, categories: [], products: [] };
  let loaded = false;
  let lang = 'tr';
  let spy = null;

  const UI = {
    tr: { soldOut: 'TÜKENDİ', empty: 'Menü yükleniyor...', fail: 'Menü yüklenemedi. Sayfayı yenileyin.', cats: 'Kategoriler', menu: 'Dil Menüsü' },
    en: { soldOut: 'SOLD OUT', empty: 'Loading menu...', fail: 'Could not load menu. Please refresh.', cats: 'Categories', menu: 'Language Menu' },
    ar: { soldOut: 'مباع', empty: 'جارٍ تحميل القائمة...', fail: 'تعذر تحميل القائمة. يرجى التحديث.', cats: 'الفئات', menu: 'قائمة اللغة' }
  };

  function L(o) {
    if (!o) return '';
    if (lang === 'ar') return o.ar || o.en || o.tr || '';
    if (lang === 'en') return o.en || o.tr || '';
    return o.tr || o.en || '';
  }

  function fmtPrice(v) { return v + ' ₺'; }
  function escapeHTML(str) { return String(str || '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }

  function getVisibleCategories() {
    return S.categories.filter(c => S.products.some(p => p.cat === c.id));
  }

  function renderHeader() {
    const cafeName = escapeHTML(S.cafe.name || 'CAFE ŞAMDAN');
    const u = UI[lang];
    const currentLangText = lang.toUpperCase();
    return `
      <div class="header">
          <h1>${cafeName}</h1>
          <div class="lang-dropdown-container">
              <button class="lang-toggle-btn" onclick="window.toggleLangMenu(event)" aria-label="${u.menu}">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  <span class="lang-text">${currentLangText}</span>
              </button>
              <div class="lang-menu" id="lang-menu">
                  <button class="${lang === 'tr' ? 'active' : ''}" onclick="window.setLang('tr')">Türkçe (TR)</button>
                  <button class="${lang === 'en' ? 'active' : ''}" onclick="window.setLang('en')">English (EN)</button>
                  <button class="${lang === 'ar' ? 'active' : ''}" onclick="window.setLang('ar')">العربية (AR)</button>
              </div>
          </div>
      </div>
    `;
  }

  function renderNav() {
    const cats = getVisibleCategories();
    if (!cats.length) return '';
    const u = UI[lang];
    
    const btns = cats.map(c => `
      <button class="cat-grid-btn" data-cat="${c.id}" onclick="window.scrollToCat('${c.id}')">${escapeHTML(L(c.name))}</button>
    `).join('');
    
    return `
      <div class="category-nav-container">
          <button class="cat-toggle-btn" onclick="window.toggleCatMenu()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
              ${u.cats}
          </button>
          <div class="cat-dropdown-menu" id="cat-dropdown-menu">
              <div class="cat-grid" id="cat-grid">
                  ${btns}
              </div>
          </div>
      </div>
    `;
  }

  function renderMacros(n) {
    if (!n) return '';
    let html = '<div class="macros">';
    if (n.kcal != null) html += `<div class="macro-badge macro-kcal">🔥 ${n.kcal} kcal</div>`;
    if (n.protein != null) html += `<div class="macro-badge macro-p">🥩 ${n.protein}g P</div>`;
    if (n.carb != null) html += `<div class="macro-badge macro-c">🌾 ${n.carb}g C</div>`;
    if (n.fat != null) html += `<div class="macro-badge macro-f">
        <svg class="macro-svg yellow-drop" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21a7.5 7.5 0 0 1-7.5-7.5C4.5 9 12 2 12 2s7.5 7 7.5 11.5A7.5 7.5 0 0 1 12 21z"/></svg> 
        ${n.fat}g Y
    </div>`;
    html += '</div>';
    return html;
  }

  function renderProducts(catId) {
    const items = S.products.filter(p => p.cat === catId);
    return items.map(p => {
      const soldOutBadge = p.soldOut ? `<span class="sold-out-badge">${UI[lang].soldOut}</span>` : '';
      const price = p.price != null ? fmtPrice(p.price) : '';
      const photo = p.photo ? `<img class="product-image" src="${p.photo}&w=240" alt="${escapeHTML(L(p.name))}" loading="lazy">` : `<div class="product-image empty"></div>`;
      const desc = L(p.desc) ? `<p class="product-desc">${escapeHTML(L(p.desc))}</p>` : '';
      
      return `
        <div class="product-card ${p.soldOut ? 'sold-out-card' : ''}">
            <div class="product-header">
                <div class="product-info">
                    <h3 class="product-title">${escapeHTML(L(p.name))} ${soldOutBadge}</h3>
                    ${desc}
                </div>
                <div class="product-price">${price}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px;">
                ${renderMacros(p.nutri)}
                ${photo}
            </div>
        </div>
      `;
    }).join('');
  }

  function renderList() {
    const cats = getVisibleCategories();
    if (!cats.length) return `<div class="message">${loaded ? UI[lang].fail : UI[lang].empty}</div>`;
    
    return `<div class="container">` + cats.map(c => `
      <section id="section-${c.id}" class="cat-section" data-cat="${c.id}">
        <h2 class="section-title">${escapeHTML(L(c.name))}</h2>
        ${renderProducts(c.id)}
      </section>
    `).join('') + `</div>`;
  }

  function renderFooter() {
    const address = S.cafe.address ? `<br>${escapeHTML(S.cafe.address)}` : '';
    const phone = S.cafe.phone ? `<br>${escapeHTML(S.cafe.phone)}` : '';
    return `<div class="footer">${escapeHTML(S.cafe.name || '')}${address}${phone}</div>`;
  }

  window.setLang = function(newLang) {
    lang = newLang;
    try { localStorage.setItem('samdan-lang', lang); } catch (e) {}
    renderAll();
  };

  
  function updateActiveNav(id) {
    const grid = document.getElementById('cat-grid');
    if (!grid) return;
    document.querySelectorAll('.cat-grid-btn').forEach(btn => {
      if (btn.getAttribute('data-cat') === id) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Dropdown logic
  window.toggleLangMenu = function(e) {
      if (e) e.stopPropagation();
      document.getElementById('lang-menu').classList.toggle('show');
      document.getElementById('cat-dropdown-menu').classList.remove('show');
  };

  window.toggleCatMenu = function() {
      document.getElementById('cat-dropdown-menu').classList.toggle('show');
      document.getElementById('lang-menu').classList.remove('show');
  };

  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
      if (!e.target.closest('.lang-dropdown-container')) {
          const langMenu = document.getElementById('lang-menu');
          if (langMenu) langMenu.classList.remove('show');
      }
      if (!e.target.closest('.category-nav-container')) {
          const catMenu = document.getElementById('cat-dropdown-menu');
          if (catMenu) catMenu.classList.remove('show');
      }
  });

  window.scrollToCat = function(id) {
      // Close menu first
      document.getElementById('cat-dropdown-menu').classList.remove('show');
      
      const el = document.getElementById('section-' + id);
      if (el) {
        // Adjust for header + new cat toggle bar height
        const y = el.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
  };

  

  window.oldScrollToCat = function(id) {
    const el = document.getElementById('section-' + id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  function renderAll() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    app.innerHTML = renderHeader() + renderNav() + renderList() + (S.categories.length ? renderFooter() : '');
    setupSpy();
  }

  function setupSpy() {
    if (spy) spy.disconnect();
    if (!('IntersectionObserver' in window)) return;
    spy = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) updateActiveNav(en.target.getAttribute('data-cat'));
      });
    }, { rootMargin: '-120px 0px -60% 0px' });
    
    document.querySelectorAll('.cat-section').forEach(el => spy.observe(el));
  }

  

  function applyData(data) {
    if (!data || !data.products || !data.products.length) return false;
    S = data;
    return true;
  }

  async function loadData() {
    let fresh = null;
    try {
      const r = await fetch('/api/menu', { headers: { Accept: 'application/json' } });
      if (r.ok) fresh = await r.json();
    } catch (e) {}
    
    if (!applyData(fresh)) {
      try {
        const r = await fetch('/fallback.json');
        if (r.ok) applyData(await r.json());
      } catch (e) {}
    } else {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); } catch (e) {}
    }
    
    loaded = true;
    renderAll();
  }

  function init() {
    try {
      const saved = localStorage.getItem('samdan-lang');
      if (saved && ['tr', 'en', 'ar'].includes(saved)) lang = saved;
    } catch (e) {}
    
    try { applyData(JSON.parse(localStorage.getItem(CACHE_KEY))); } catch (e) {}
    
    renderAll();
    loadData();
  }

  init();
})();
