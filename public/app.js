document.addEventListener('DOMContentLoaded', () => {
    window.currentLang = 'tr';
    window.menuData = { categories: [], products: [] };
    
    fetchMenuData();
});

async function fetchMenuData() {
    try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        if (data && data.success) {
            window.menuData = data;
            // Render categories initially (hidden until language chosen)
            renderCategories();
        }
    } catch (err) {
        console.error('Menü verisi yüklenirken hata:', err);
    }
}

function selectLanguage(lang) {
    window.currentLang = lang;
    document.getElementById('globalLangSelect').value = lang;
    
    // Switch pages
    document.getElementById('page-lang').classList.remove('active');
    document.getElementById('page-menu').classList.add('active');
    document.getElementById('backArrowBtn').style.display = 'block';
    window.scrollTo(0, 0);
    renderCategories();
}

function onLangChange(lang) {
    window.currentLang = lang;
    renderCategories();
}

function goBackToLang() {
    document.getElementById('page-menu').classList.remove('active');
    document.getElementById('page-lang').classList.add('active');
    document.getElementById('backArrowBtn').style.display = 'none';
    window.scrollTo(0, 0);
}

function renderCategories() {
    const container = document.getElementById('categoriesListContainer');
    if (!container) return;

    const categories = window.menuData.categories || [];
    const products = window.menuData.products || [];

    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align:center; opacity:0.6;">Kategori bulunamadı.</p>';
        return;
    }

    let html = '';
    categories.forEach(cat => {
        const catName = cat.Kategori || cat.Name || Object.values(cat)[0] || '';
        
        // Filter products for this category
        const catProducts = products.filter(p => {
            const pCat = p.Kategori || p.Category || Object.values(p)[0] || '';
            return pCat.trim().toLowerCase() === catName.trim().toLowerCase();
        });

        const lang = window.currentLang;
        let displayName = catName;
        if (lang === 'en' && cat.Kategori_EN) displayName = cat.Kategori_EN;
        if (lang === 'ar' && cat.Kategori_AR) displayName = cat.Kategori_AR;

        html += `
            <div class="category-accordion">
                <div class="category-bar" onclick="toggleCategoryAccordion(this)">
                    <span>${displayName}</span>
                </div>
                <div class="products-dropdown">
        `;

        if (catProducts.length === 0) {
            html += `<div style="padding: 15px 20px; opacity: 0.5; font-size: 14px;">Bu kategoride henüz ürün bulunmuyor.</div>`;
        } else {
            catProducts.forEach(prod => {
                const titleKey = lang === 'en' ? 'Ürün Adı (EN)' : (lang === 'ar' ? 'Ürün Adı (AR)' : 'Ürün Adı (TR)');
                const descKey = lang === 'en' ? 'Açıklama (EN)' : (lang === 'ar' ? 'Açıklama (AR)' : 'Açıklama (TR)');
                
                const prodName = prod[titleKey] || prod['Ürün Adı (TR)'] || prod.Name || 'Ürün';
                const prodDesc = prod[descKey] || prod['Açıklama (TR)'] || prod.Description || '';
                const prodPrice = prod['Fiyat'] || prod['Price'] || '';
                const prodImg = prod.imageUrl || prod.Image || '';

                html += `
                    <div class="product-card">
                        <div class="product-info">
                            <div class="product-title">${prodName}</div>
                            ${prodDesc ? `<div class="product-desc">${prodDesc}</div>` : ''}
                            ${prodPrice ? `<div class="product-price">${prodPrice} TL</div>` : ''}
                        </div>
                        ${prodImg ? `<img src="${prodImg}" class="product-img" onclick="openImageModal('${prodImg}')" alt="${prodName}" />` : ''}
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleCategoryAccordion(barElement) {
    const accordion = barElement.parentElement;
    accordion.classList.toggle('open');
}

function openImageModal(imgSrc) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    modal.style.display = 'flex';
    modalImg.src = imgSrc;
}

function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
}
