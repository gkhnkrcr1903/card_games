# Briç & King

Bilgisayara karşı Briç ve King oynanan, oynayarak briç öğreten web uygulaması. Saf HTML/CSS/JS, derleme gerekmez.

## Yerelde çalıştırma
```
python -m http.server 8123
```
Sonra http://localhost:8123 adresini açın. ES modülleri kullanıldığı için dosyayı doğrudan (file://) açmak çalışmaz.

## Yayınlama
Klasörü olduğu gibi herhangi bir statik barındırmaya yükleyin: GitHub Pages, Netlify, Vercel veya Cloudflare Pages.

## Yapı
- `js/cards.js` – deste, dağıtım, puan sayma
- `js/engine.js` – löve motoru, sezgisel oyun, Monte Carlo arama (Zor seviye)
- `js/bridge.js` – deklarasyon sistemi (Standart Amerikan, Stayman, transfer), oyun AI, skor
- `js/king.js` – King kuralları, ceza/koz oyunları, oyun seçme AI
- `js/lessons.js` – dersler ve King kuralları
- `js/app.js` – arayüz, öğretici mod, alıştırmalar
