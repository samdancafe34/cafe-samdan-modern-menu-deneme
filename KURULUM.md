# Cafe Şamdan Menü: Kurulum ve Kullanım

## Nasıl çalışıyor?

```
Google E-Tablo (menüyü sen düzenlersin)
        │  "Web'de yayınla" CSV bağlantıları (3 sekme)
        ▼
Vercel (api/menu) ── 5 dakikada bir okur, doğrular, önbelleğe alır
        │
        ▼
Müşterinin telefonu (menü sayfası)

Google Drive "Menü Fotoğrafları" klasörü ──► api/photo (küçültür, önbelleğe alır)
```

- **Yazı, fiyat, besin değeri, kategori:** sadece E-Tablo'da değişir. GitHub'a girmen gerekmez. Değişiklik en geç birkaç dakikada sitede görünür.
- **Fotoğraf:** Drive'daki klasöre koyarsın. Dosya adı ürün adıyla aynıysa site otomatik bulur.
- **Kod değişikliği (tasarım vb.):** GitHub'daki dosyalar değişir, Vercel kendiliğinden yeniden yayınlar.
- **Bir şey bozulursa:** E-Tablo okunamıyorsa site son kayıtlı menüyü gösterir. Hangi satırın neden alınmadığını `/kontrol` sayfasından görürsün.

## Kurulum adımları (bir kez)

Ekran adları zamanla değişebilir; menü yerleri farklıysa arama kutusunu kullan.

### 1. GitHub
1. github.com'da hesap aç, **New repository** de, adı `cafe-samdan-menu`, **Private** seç.
2. **uploading an existing file** bağlantısına tıkla.
3. Bu paketi açtığın klasörün **içindeki her şeyi** (api, lib, public, test, scripts klasörleri ve tüm dosyalar) sürükleyip bırak. Klasörün kendisini değil, içindekileri yükle. `node_modules` klasörü pakette yok, yüklemene gerek yok.
4. **Commit changes** de.

### 2. Vercel
1. vercel.com'da GitHub hesabınla giriş yap.
2. **Add New > Project** ile `cafe-samdan-menu` deposunu içe aktar.
3. **Framework Preset:** `Other` kalsın. Build Command ve Output Directory'ye dokunma (ayarlar `vercel.json`'da).
4. (Fotoğraflar için, 3. ve 4. adımı bitirince) **Environment Variables** bölümüne iki değişken ekle:
   - `GOOGLE_API_KEY` = 4. adımda aldığın anahtar
   - `DRIVE_FOLDER_ID` = 3. adımdaki klasör numarası
5. **Deploy** de. Bittiğinde Vercel sana geçici bir adres (`...vercel.app`) verir. Menü orada açılmalı.

> Not: Vercel'in ücretsiz planı ticari kullanıma izin vermiyor. Bir işletmenin menüsü için ücretli plan gerekir, bu karar ve sorumluluk sende.

### 3. Fotoğraf klasörü (Google Drive)
1. Drive'da **Yeni > Klasör**, adı `Menü Fotoğrafları`.
2. Klasöre sağ tık > **Paylaş** > Genel erişim: **Bağlantıya sahip olan herkes** (Görüntüleyen).
3. Klasörü açınca adres çubuğundaki `.../folders/` sonrasındaki uzun kod klasör numarasıdır. Kopyala.
4. Klasöre **sadece menü fotoğraflarını** koy. Özel hiçbir şey koyma, çünkü bağlantıyı bilen herkes görebilir.

### 4. Google Cloud anahtarı (fotoğrafları okumak için)
1. console.cloud.google.com'a gir, yeni bir proje oluştur.
2. **APIs & Services > Library** içinde **Google Drive API**'yi bul, **Enable** de.
3. **APIs & Services > Credentials > Create credentials > API key** de. Çıkan anahtarı kopyala.
4. Anahtarın ayarlarına gir, **API restrictions > Restrict key** seç, sadece **Google Drive API**'yi işaretle. **Application restrictions** için `None` kalsın (Vercel'in adresleri sabit değil).
5. Anahtarı kimseyle paylaşma, sadece Vercel'e yapıştır.

### 5. Kendi alan adın
Vercel'de projenin **Settings > Domains** bölümüne `cafesamdan.com.tr` ve `www.cafesamdan.com.tr`'yi ekle. Vercel sana satıcıya iletilecek kayıtları (A ve CNAME) gösterir.
- Satıcıya sadece bu iki kaydı değiştirmesini söyle. **MX kayıtlarına ve nameserver'a dokunmasın** (e-postan varsa kesilir).
- **Geçişten önce** eski sitenin tam yedeğini al.
- Eski kategori adresleri (örn. `/kebaplar-kebab/`) yeni menüde ilgili kategoriye açılır.

## Günlük kullanım

| Yapmak istediğin | Nasıl |
|---|---|
| Fiyat değiştirmek | E-Tablo > Ürünler > Fiyat. **Ayarlar** sekmesinde "Fiyat tarihi"ni güncelle. |
| Yeni ürün | Ürünler sekmesinin en altındaki boş satıra yaz. Kategoriyi listeden seç. |
| Ürünü geçici kaldırmak | "Gizli" sütununa `E` yaz. |
| Tükendi göstermek | "Tükendi" sütununa `E` yaz. |
| Fotoğraf eklemek | Drive klasörüne koy. Dosya adı = ürün adı (büyük/küçük harf ve Türkçe karakter fark etmez). Ad uymuyorsa dosya adını "Fotoğraf dosya adı" sütununa yaz. |
| Fotoğrafı değiştirmek | Drive'da dosyayı aynı adla yenisiyle değiştir. |
| Sorun var mı bakmak | `adresin/kontrol` sayfası. |

**Fotoğraf biçimi:** JPG veya PNG yükle. iPhone'un HEIC biçimi tarayıcılarda görünmez.
**Beklenen gecikme:** Değişiklik 5-10 dakikada sitede görünür (Google'ın yayınlama gecikmesi + 5 dakikalık önbellek).

## E-Tablo kuralları (bozulmasın diye)
- İlk satırdaki (başlık) sütun adlarını değiştirme, sütun silme veya ekleme.
- Hücre birleştirme yapma. Kategori adı her satırda yazılı olsun.
- Fiyat ve besin değerlerine sadece sayı yaz (12,5 gibi).
- Enerji (kcal) sütunu formüldür: 4 × protein + 4 × karbonhidrat + 9 × yağ. Elle yazma.
- "Web'de yayınla" ayarını kapatma. Kapatırsan site son kayıtlı menüyü göstermeye devam eder, güncellemeler yansımaz.
- Yanlışlıkla bir şey silersen: **Dosya > Sürüm geçmişi** ile geri al.

## Teknik notlar

- **Yerel deneme:** `npm install`, sonra `DEV_MOCK=1 node dev.js` (taklit verilerle) ve `npm test`.
- **Acil durum yedeği:** `public/fallback.json`. E-Tablo hiç okunamazsa gösterilir ve zamanla eskir. Güncellemek için `node scripts/update-fallback.js` çalıştırıp dosyayı GitHub'a yükleyebilirsin. Zorunlu değil.
- **Taşınabilirlik:** Kod Vercel'e özel bir şey kullanmıyor. `api/` altındaki iki dosya (Node.js) başka bir platforma (Netlify, Cloudflare vb.) küçük uyarlamalarla taşınabilir.
- **E-Tablo bağlantıları** `lib/config.js` içinde. E-Tabloyu değiştirirsen oradaki üç bağlantıyı (veya Vercel'de `PRODUCTS_CSV_URL`, `CATEGORIES_CSV_URL`, `SETTINGS_CSV_URL`) güncelle.
