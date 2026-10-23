// Briç dersleri ve King kuralları (HTML içerik)
export const LESSONS = [
  {
    title: '1. Briç nedir?',
    html: `<p>Briç, 52 kartlık desteyle <b>4 kişi</b> ve <b>iki eşli takım</b> hâlinde oynanır: <b>Kuzey–Güney</b> ve <b>Doğu–Batı</b>. Eşler karşılıklı oturur. Siz Güney'siniz, eşiniz Kuzey.</p>
    <p>Her oyuncuya 13 kart dağıtılır. Bir el iki aşamadan oluşur:</p>
    <ol><li><b>Deklarasyon (ihale):</b> Takımlar kaç löve alacaklarını ve hangi rengin koz olacağını açık artırmayla belirler.</li>
    <li><b>Oyun:</b> 13 löve oynanır. Kontratı alan taraf söz verdiği kadar löve almaya, rakipler de onu batırmaya çalışır.</li></ol>
    <p><b>Löve:</b> Her oyuncunun sırayla bir kart attığı 4 kartlık turdur. Açılan renge uymak <b>zorunludur</b>; o renkten kartınız yoksa istediğinizi atabilirsiniz. En büyük koz, koz yoksa açılan rengin en büyüğü löveyi alır.</p>`,
  },
  {
    title: '2. El değerlendirme: puan sayma',
    html: `<p>Elin gücünü <b>Honör Puanı (HP)</b> ile ölçeriz:</p>
    <table class="tbl"><tr><th>As (A)</th><th>Papaz (K)</th><th>Kız (Q)</th><th>Vale (J)</th></tr><tr><td>4</td><td>3</td><td>2</td><td>1</td></tr></table>
    <p>Destede toplam 40 HP vardır; ortalama bir el 10 HP'dir.</p>
    <p><b>Dağılım puanı:</b> Uzun renkler ek değer taşır. 5. karttan itibaren her kart +1 sayılır. Eşinizin rengine uyumunuz varsa kısalıklar sayılır: boşluk (void) 5, tekli (singleton) 3, ikili (doubleton) 1.</p>
    <p><b>Dengeli el:</b> 4-3-3-3, 4-4-3-2 veya 5-3-3-2 dağılımlı el. Dengeli eller Sanzatu (SA) için uygundur.</p>
    <p><b>Hedefler (eşlerin toplam puanı):</b></p>
    <ul><li>25+ puan → <b>manş (oyun)</b>: 3SA, 4♥, 4♠ (minörde 5♣/5♦ için ~29)</li><li>33+ puan → <b>küçük şlem</b> (6 seviye)</li><li>37+ puan → <b>büyük şlem</b> (7 seviye)</li></ul>`,
  },
  {
    title: '3. Deklarasyonun temelleri',
    html: `<p>Her deklarasyon bir <b>seviye</b> (1–7) ve bir <b>renk</b> içerir. Seviye, 6'nın üstünde alınacak löve sayısıdır: <b>1♠ = 7 löve</b>, <b>4♠ = 10 löve</b>, <b>7SA = 13 löve</b>.</p>
    <p>Renklerin sıralaması (küçükten büyüğe): <b>♣ Sinek &lt; ♦ Karo &lt; ♥ Kupa &lt; ♠ Maça &lt; SA (Sanzatu)</b>. ♥ ve ♠ <b>majör</b>, ♣ ve ♦ <b>minör</b> renklerdir.</p>
    <p>Her yeni deklarasyon bir öncekinden yüksek olmalıdır. Ayrıca şunları diyebilirsiniz:</p>
    <ul><li><b>Pas</b>: deklarasyon yapmamak</li><li><b>Kontr</b>: rakip kontratı ikiye katlamak (ya da “eşim renk söylesin” anlamında takeout)</li><li><b>Sürkontr</b>: kontr edilen kendi kontratınızı tekrar katlamak</li></ul>
    <p>Bir deklarasyondan sonra art arda 3 pas gelince ihale biter. Son deklarasyon <b>kontrattır</b>. Kontrat rengini o tarafta <b>ilk</b> söyleyen oyuncu <b>deklarandır</b>; eşi <b>yer (dummy)</b> olur.</p>`,
  },
  {
    title: '4. Açış deklarasyonları',
    html: `<table class="tbl">
    <tr><th>Açış</th><th>Anlamı</th></tr>
    <tr><td>Pas</td><td>0–11 puan</td></tr>
    <tr><td>1♣ / 1♦</td><td>12–21 puan, 5 kartlı majör yok. Uzun minörü açın (3-3'te 1♣, 4-4'te 1♦)</td></tr>
    <tr><td>1♥ / 1♠</td><td>12–21 puan, 5+ kart. İki 5'li varsa önce maça</td></tr>
    <tr><td>1SA</td><td>15–17 puan, dengeli el</td></tr>
    <tr><td>2♣</td><td>22+ puan; güçlü ve yapay (sinek göstermez)</td></tr>
    <tr><td>2♦ / 2♥ / 2♠</td><td>Zayıf iki: 6–10 puan, 6 kartlı renk</td></tr>
    <tr><td>2SA</td><td>20–21 puan, dengeli</td></tr>
    <tr><td>3 seviye</td><td>Engelleme: zayıf el, 7 kartlı renk</td></tr></table>
    <p><b>20 kuralı:</b> 11 puanlı bir elde iki en uzun rengin kart sayısı + HP ≥ 20 ise açabilirsiniz.</p>`,
  },
  {
    title: '5. Eşin açışına cevap',
    html: `<p><b>Eşiniz 1 renk açtığında:</b></p>
    <table class="tbl">
    <tr><th>Cevap</th><th>Anlamı</th></tr>
    <tr><td>Pas</td><td>0–5 puan</td></tr>
    <tr><td>Rengine 2 seviyede destek</td><td>6–9 puan, majörde 3+ kart</td></tr>
    <tr><td>Rengine 3 seviyede destek</td><td>10–12 puan (davet / limit)</td></tr>
    <tr><td>Rengine 4 seviyede (majör)</td><td>13+ puan, manş</td></tr>
    <tr><td>1 seviyede yeni renk</td><td>6+ puan, 4+ kart, zorlayıcı (açan tekrar konuşmalı)</td></tr>
    <tr><td>2 seviyede yeni renk</td><td>10+ puan, 4+ kart (kupa için 5+)</td></tr>
    <tr><td>1SA</td><td>6–10 puan, uyum yok</td></tr>
    <tr><td>2SA / 3SA</td><td>11–12 / 13–15 puan, dengeli</td></tr></table>
    <p><b>Eşiniz 1SA açtığında:</b></p>
    <ul><li><b>Pas</b>: 0–7 puan</li><li><b>2♣ Stayman</b>: 8+ puan ve 4 kartlı majör. Açan 2♦ (majör yok), 2♥ veya 2♠ der.</li>
    <li><b>2♦ / 2♥ Transfer</b>: 5+ kupa / 5+ maça. Açan bir üst rengi söyler, böylece güçlü el deklaran olur.</li>
    <li><b>2SA</b>: 8–9 puan davet, <b>3SA</b>: 10–15 puan</li></ul>`,
  },
  {
    title: '6. Rekabet: ara deklarasyon ve kontr',
    html: `<p>Rakip açtığında da konuşabilirsiniz:</p>
    <ul><li><b>Ara deklarasyon</b>: 8–16 puan ve iyi bir 5+ kartlı renk. 2 seviyede 10+ puan önerilir.</li>
    <li><b>1SA ara deklarasyon</b>: 15–18 puan, dengeli, rakibin renginde durdurucu (A, Kx, Qxx).</li>
    <li><b>Takeout kontr</b>: 12+ puan, rakibin renginde kısa (0–2 kart), diğer renklerde 3+ kart. Eşiniz en uzun rengini söylemek zorundadır.</li></ul>
    <p><b>Toplam löve kuralı:</b> Rekabet ederken ortaklığınızdaki koz sayısı kadar löveye (kart sayısı − 6 seviyesine) kadar çıkmak genelde güvenlidir: 8 koz → 2 seviye, 9 koz → 3 seviye.</p>`,
  },
  {
    title: '7. Oyun: atak ve yer',
    html: `<p>Deklaranın solundaki oyuncu ilk kartı (<b>atak</b>) atar. Ardından yer (dummy) elini masaya açar; deklaran her iki eli de oynar.</p>
    <p><b>İyi atak seçimleri:</b></p>
    <ul><li>Eşinizin söylediği renk</li><li>Honör dizisinin en büyüğü: <b>K</b>-Q-J, <b>Q</b>-J-10</li><li>Sanzatuda en uzun renginizden 4. büyük kart</li><li>Kozlu oyunda A-K'dan As; tek kartlı renk atağı (kesmek için)</li></ul>
    <p><b>Savunmanın altın kuralları:</b> İkinci el küçük oynar, üçüncü el büyük oynar, honörü honörle karşılayın (cover an honor).</p>`,
  },
  {
    title: '8. Deklaran teknikleri',
    html: `<ul>
    <li><b>Plan yapın:</b> Yer açılınca kesin lövelerinizi sayın. Eksik lövenizi nereden bulacaksınız?</li>
    <li><b>Koz çekin:</b> Kozlu kontratta önce rakiplerin kozlarını toplayın ki küçük kartlarınızı kesmesinler.</li>
    <li><b>Empas (finesse):</b> A-Q elinizdeyse küçük karttan Q'ya doğru oynayın; K solunuzdaysa Q löve alır (%50 şans).</li>
    <li><b>Kesme (ruff):</b> Yerde kısa olan rengi yerdeki kozlarla keserek fazladan löve alın.</li>
    <li><b>Uzun rengi geliştirin:</b> Sanzatuda uzun renginizi açıp son kartları löve yapın.</li>
    <li><b>Giriş (entry) yönetimi:</b> Kazanan kartlarınıza ulaşabileceğiniz girişleri koruyun.</li></ul>`,
  },
  {
    title: '9. Skor',
    html: `<table class="tbl">
    <tr><th>Löve değeri</th><th>Puan</th></tr>
    <tr><td>♣ ♦ (minör)</td><td>20 / löve</td></tr><tr><td>♥ ♠ (majör)</td><td>30 / löve</td></tr><tr><td>SA</td><td>ilk löve 40, sonrakiler 30</td></tr></table>
    <ul><li>Kontrat lövesi 100+ ise <b>manş primi</b>: zonsuz 300, zonlu 500; değilse kısmi oyun primi 50.</li>
    <li><b>Şlem primi</b>: küçük şlem 500/750, büyük şlem 1000/1500.</li>
    <li><b>Batma</b>: zonsuz 50, zonlu 100 / eksik löve (kontrlü daha fazla).</li>
    <li><b>Zon (vulnerable)</b>: el numarasına göre değişir; zonlu taraf hem daha çok kazanır hem daha çok kaybeder.</li></ul>`,
  },
];

export const KING_RULES = `<p>King 4 kişiyle 52 kartla oynanır, toplam <b>20 oyun</b> sürer. Her oyunda sırası gelen oyuncu, kartlarını gördükten sonra oyunu seçer ve ilk kartı o açar.</p>
<p>Her oyuncu toplamda <b>3 ceza</b> ve <b>2 koz</b> oyunu seçer. Her ceza türü oyun boyunca en fazla <b>2 kez</b> oynanır.</p>
<table class="tbl"><tr><th>Oyun</th><th>Kural</th></tr>
<tr><td>El Almaz</td><td>Her löve -50</td></tr><tr><td>Kupa Almaz</td><td>Her kupa -30</td></tr><tr><td>Erkek Almaz</td><td>Her K ve J -60</td></tr>
<tr><td>Kız Almaz</td><td>Her Q -100</td></tr><tr><td>Rıfkı</td><td>♥K -320</td></tr><tr><td>Son İki</td><td>Son iki löve -180'er</td></tr><tr><td>Koz</td><td>Her löve +50 (seçen kozu belirler)</td></tr></table>
<p><b>Temel kurallar:</b></p><ul>
<li>Açılan renge uymak zorunludur; yerdeki en büyük karttan büyüğünüz varsa <b>büyük atmak zorunludur</b>.</li>
<li>Kupa Almaz ve Rıfkı'da kupa kırılmadan kupa açılamaz.</li>
<li>Renk yoksa: Kupa'da kupa, Kız'da kız, Erkek'te K/J, Rıfkı'da ♥K atmak zorunludur. Kozda koz çakmak (mümkünse üstten) zorunludur.</li>
<li>Koz oyununda koz kırılmadan koz açılamaz.</li></ul>
<p><b>Eşli King:</b> Karşılıklı oturanlar eştir, puanlar takım olarak toplanır. <b>Tekli King:</b> herkes kendi için oynar.</p>
<p><b>İpuçları:</b> Ceza oyunlarında yüksek kartlardan, güvenliyken (yerde daha büyüğü varken) kurtulun. Tek kalmış (kısa) renkler size atma fırsatı verir. Kozda uzun ve güçlü renginizi koz seçin.</p>`;
