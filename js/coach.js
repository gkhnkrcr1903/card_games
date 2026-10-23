// Briç koçu: önerilerin NEDEN yapıldığını öğretici dille açıklar.
import { SUITS, SUIT_NAMES, cardStr, rankStr, hcp, lengths, isBalanced } from './cards.js';
import { trickWinner, isMaster, beats, lowest, highest } from './engine.js';
import { analyze, chooseBid, bidStr, auctionState, suitOf, STRAIN_SYM } from './bridge.js';

const SEAT = ['Siz (Güney)', 'Batı', 'Eşiniz (Kuzey)', 'Doğu'];
const sn = s => SUIT_NAMES[s].toLowerCase();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const sec = (title, body) => `<div class="co-sec"><div class="co-t">${title}</div>${body}</div>`;

// ---------------- DEKLARASYON ----------------
function handFacts(hand) {
  const h = hcp(hand), L = lengths(hand), bal = isBalanced(hand);
  const dist = L.reduce((a, n) => a + Math.max(0, n - 4), 0);
  const honors = hand.filter(c => c.r > 10).map(c => `${cardStr(c)}=${c.r - 10}`).join(', ') || 'honör yok';
  const shape = L.slice().sort((a, b) => b - a).join('-');
  const longest = [0, 1, 2, 3].reduce((b, s) => (L[s] > L[b] ? s : b), 0);
  return { h, L, bal, dist, honors, shape, longest };
}

function rangeTxt(I) {
  const mx = I.max >= 37 ? '+' : `–${I.max}`;
  return I.min === 0 && I.max >= 37 ? 'puanı belirsiz' : `${I.min}${mx} HP`;
}
function shownTxt(I) {
  const parts = [rangeTxt(I)];
  I.len.forEach((n, s) => { if (n) parts.push(`${n}+ ${SUITS[s]}`); });
  if (I.bal) parts.push('dengeli');
  return parts.join(', ');
}

// Bu durumda hangi kurallar geçerli?
function ruleFor(auction, seat, ctx) {
  const st = auctionState(auction), pa = (seat + 2) % 4;
  const myN = auction.filter(a => a.seat === seat && a.call.t !== 'p').length;
  if (!st.last) return {
    lesson: 3, title: 'Açış kuralları',
    body: '12+ HP ile açın. 15–17 dengeli → 1SA, 20–21 dengeli → 2SA, 22+ → 2♣. 5+ kartlı majör varsa 1♥/1♠, yoksa uzun minör. 6–10 HP ve 6 kartlı renk → zayıf iki. <b>20 kuralı:</b> 11 HP + iki en uzun rengin kart sayısı ≥ 20 ise de açılabilir.',
  };
  if (ctx.opener === pa && !myN) {
    const ob = ctx.openBid;
    if (ob.st === 4 && ob.l === 1) return {
      lesson: 4, title: '1SA açışına cevap',
      body: 'Eşiniz 15–17 HP. Toplam 25 için sizin ~8–10 HP gerekir. 5+ majör → transfer (2♦=♥, 2♥=♠). 4 kartlı majör + 8 HP → 2♣ Stayman. Dengeli: 0–7 pas, 8–9 2SA (davet), 10–15 3SA.',
    };
    return {
      lesson: 4, title: 'Eşin açışına cevap',
      body: '0–5 HP pas. Majör açışa 3+ kart destek: 6–9 → 2, 10–12 → 3, 13+ → 4 seviye. Uyum yoksa: 1 seviyede yeni renk (6+ HP, 4+ kart, zorlayıcı) ya da 1SA (6–10). 2 seviyede yeni renk 10+ HP ister.',
    };
  }
  if (ctx.opener >= 0 && ctx.opener % 2 !== seat % 2 && !myN) return {
    lesson: 5, title: 'Rakip açtığında',
    body: 'Ara deklarasyon: 8–16 HP ve iyi 5+ kartlı renk (2 seviyede 10+). 1SA: 15–18 dengeli + rakip renkte durdurucu. Takeout kontr: 12+ HP, rakip renkte kısa, diğer renklerde destek. Bunlar yoksa pas.',
  };
  return {
    lesson: 1, title: 'Hedef kontratı bulmak',
    body: 'Kendi puanınıza eşinizin gösterdiği aralığı ekleyin. Toplam 25+ → manş (3SA veya 4♥/4♠; minörde ~29 → 5♣/5♦), 33+ → küçük şlem. Ortak 8+ kart majör uyumu varsa majörde, yoksa sanzatuda oynamak genelde en iyisidir.',
  };
}

export function explainBid(auction, seat, hand) {
  const rec = chooseBid(auction, seat, hand);
  const A = analyze(auction);
  const f = handFacts(hand);
  const pa = (seat + 2) % 4;
  const P = A.info[pa];
  const rule = ruleFor(auction, seat, A.ctx);

  const handBody = `<ul>
    <li><b>${f.h} honör puanı</b> (${f.honors})${f.dist ? ` + ${f.dist} uzunluk puanı` : ''}</li>
    <li>Dağılım ${f.shape}: ${[0, 1, 2, 3].map(s => `${SUITS[s]}${f.L[s]}`).join(' ')} → ${f.bal ? '<b>dengeli</b> (sanzatuya uygun)' : `<b>dengesiz</b>, en uzun renk ${sn(f.longest)}`}</li></ul>`;

  let table = '';
  const talked = [0, 1, 2, 3].filter(s => s !== seat && auction.some(a => a.seat === s && a.call.t !== 'p'));
  if (talked.length) {
    table = `<ul>${talked.map(s => `<li><b>${SEAT[s]}</b>: ${auction.filter(a => a.seat === s).map(a => bidStr(a.call)).join(', ')} → ${shownTxt(A.info[s])}</li>`).join('')}</ul>`;
    if (talked.includes(pa) && P.min > 0) {
      const lo = f.h + P.min, hi = f.h + Math.min(P.max, P.min + 10);
      const verdict = lo >= 33 ? 'şlem bölgesi' : lo >= 25 ? 'manş kesin' : hi >= 25 ? 'manş mümkün, aralığa bağlı' : 'kısmi kontrat (manş uzak)';
      table += `<p>Ortaklık toplamı: siz ${f.h} + eşiniz ${P.min}–${Math.min(P.max, P.min + 10)} = <b>${lo}–${hi} HP</b> → ${verdict}.</p>`;
      const fits = [0, 1, 2, 3].filter(s => P.len[s] && P.len[s] + f.L[s] >= 8);
      if (fits.length) table += `<p>Koz uyumu: ${fits.map(s => `${SUITS[s]} ${f.L[s]}+${P.len[s]} = ${f.L[s] + P.len[s]} kart`).join(', ')} (8+ kart uyum iyi bir koz rengidir).</p>`;
    }
  } else table = '<p>Henüz kimse anlamlı bir deklarasyon yapmadı.</p>';

  const html = `<div class="co-head">Öneri: <b class="big">${bidStr(rec.call)}</b></div>
    ${sec('1 · Elinizi değerlendirin', handBody)}
    ${sec('2 · Masada ne söylendi?', table)}
    ${sec(`3 · Kural: ${rule.title}`, `<p>${rule.body}</p>`)}
    ${sec('4 · Sonuç', `<p>${esc(rec.expl).replace(/^([^:]+):/, '<b>$1</b>:')}</p>`)}`;
  return { call: rec.call, expl: rec.expl, html, lesson: rule.lesson };
}

// ---------------- OYUN ----------------
const POSN = ['Atak (ilk kart)', 'İkinci el', 'Üçüncü el', 'Son el (dördüncü)'];

// Önerilen/oynanan kartın arkasındaki briç ilkesini bul
export function cardReason(st, p, c, contract) {
  const trump = st.trump, part = (p + 2) % 4;
  const isDecl = p % 2 === contract.declarer % 2;
  const hand = st.hands[p];
  const suitCards = hand.filter(x => x.s === c.s).sort((a, b) => b.r - a.r);
  const n = st.trick.length;
  if (n === 0) {
    if (isDecl && trump != null && c.s === trump) {
      const ours = hand.filter(x => x.s === trump).length + st.hands[part].filter(x => x.s === trump).length;
      const out = 13 - st.played.filter(x => x.s === trump).length - ours;
      if (out > 0) return { name: 'Koz çekme', text: `Rakiplerde hâlâ ~${out} koz var. Önce kozları toplayın ki kazanan kartlarınızı kesemesinler.`, lesson: 7 };
    }
    if (isMaster(st, p, c)) return { name: 'Kesin löveyi almak', text: `${cardStr(c)} bu renkte kalan en büyük kart: kesin bir löve. ${isDecl ? 'Deklaran olarak kesin lövelerinizi doğru zamanda alın.' : 'Savunmada kesin lövenizi kaybetmeden alın.'}`, lesson: 7 };
    const pl = !isDecl && st.tricks.find(t => t.cards[0].p === part);
    if (pl && pl.cards[0].c.s === c.s) return { name: 'Eşin rengine dönmek', text: `Eşiniz ${sn(c.s)} açmıştı; bu renkte değeri olabilir. Eşin rengine dönmek savunmanın temel kuralıdır.`, lesson: 6 };
    const i = suitCards.findIndex(x => x.r === c.r);
    if (i === 0 && suitCards[1] && suitCards[1].r === c.r - 1 && c.r >= 11) return { name: 'Dizinin tepesi', text: `${suitCards.slice(0, 3).map(x => rankStr(x.r)).join('-')} gibi ardışık honörlerde en büyüğü açılır: rakibin honörünü düşürür, size bir löve geliştirir ve eşinize elinizi anlatır.`, lesson: 6 };
    if (trump == null && suitCards.length >= 4 && i === 3) return { name: 'Uzun rengin 4. büyüğü', text: `Sanzatuda en uzun renginizi (${suitCards.length} kart) geliştirmek istersiniz. Klasik atak 4. büyük karttır; eşiniz kalan kartları hesaplayabilir.`, lesson: 6 };
    if (c.r === lowest(suitCards).r) return { name: 'Küçük kartla açmak', text: `Uzun/güvenli bir renkten küçük kartla açarak honörlerinizi koruyorsunuz; eşinizin ya da yerin büyükleri löveyi alabilir.`, lesson: 6 };
    return { name: 'Renk geliştirme', text: 'Bu renk, ileride ek löve kazandırabilecek renginiz.', lesson: 7 };
  }
  const L = st.trick[0].c.s;
  const wp = trickWinner(st.trick, trump), wc = st.trick.find(t => t.p === wp).c;
  const partnerWin = wp === part;
  const wins = beats(c, wc, trump);
  if (c.s !== L) {
    if (trump != null && c.s === trump) return wins
      ? { name: 'Kesme (ruff)', text: `${sn(L)} renginde kartınız yok; kozla keserek löveyi alıyorsunuz. En küçük yeterli kozu kullanın.`, lesson: 7 }
      : { name: 'Koz atmak', text: 'Bu koz löveyi kazanamıyor.', lesson: 7 };
    return { name: 'Iskarta', text: `${sn(L)} yok${partnerWin ? ' ve löve eşinizde' : ''}. ${trump != null ? 'Kesmek yerine' : ''} işe yaramayacak, kazanma şansı olmayan bir kartı atın; kazanan kartlarınızı ve uzun renginizi saklayın.`, lesson: 7 };
  }
  if (partnerWin && !wins) return { name: 'Eşinizin lövesine küçük atmak', text: `Löveyi şu an eşiniz ${cardStr(wc)} ile alıyor. Büyük kart harcamayın, en küçüğü atın.`, lesson: 6 };
  if (!wins) return { name: 'Kazanamayınca en küçük', text: `${cardStr(wc)} yenilemiyor; değerli kartlarınızı ziyan etmeyin, en küçüğü verin.`, lesson: 6 };
  if (n === 3) return { name: 'Son el: ucuz kazanmak', text: 'Son oynayan sizsiniz, kimse sizden sonra kart atmayacak. Löveyi kazanan en küçük kartla alın.', lesson: 6 };
  if (n === 1) return wc.r >= 11
    ? { name: 'Honörü honörle karşılamak', text: `Rakip ${cardStr(wc)} ile geldi. Üstünü örterek onun honörünü düşürüyorsunuz; bu, ortaklığınızın küçük kartlarını yükseltir.`, lesson: 6 }
    : { name: 'İkinci elde kazanmak', text: 'Bu kart kesin kazanıyor (en büyük kart) ya da sonraki oyuncunun büyüğünü düşürmek için gerekli.', lesson: 6 };
  return { name: 'Üçüncü el büyük', text: 'Üçüncü elde, son oyuncunun alamayacağı kadar büyük oynayın; eşinizin atağını destekleyip löveyi garantileyin.', lesson: 6 };
}

export function situation(st, p, contract, viewer) {
  const side = contract.declarer % 2, ours = p % 2 === side;
  const need = 6 + contract.l;
  const won = st.won[p % 2] + st.won[(p % 2) + 2];
  const target = ours ? need : 14 - need;
  const left = 13 - st.tricks.length;
  const lines = [];
  lines.push(`Kontrat <b>${contract.l}${STRAIN_SYM[contract.st]}</b>. ${ours ? 'Deklaran tarafısınız' : 'Savunmadasınız'}: hedef <b>${target}</b> löve, şu ana kadar <b>${won}</b>, kalan ${left}.`);
  const posTxt = POSN[st.trick.length];
  if (st.trick.length) {
    const wp = trickWinner(st.trick, st.trump), wc = st.trick.find(t => t.p === wp).c;
    lines.push(`Pozisyon: <b>${posTxt}</b>. Löveyi şu an ${wp === (p + 2) % 4 ? '<b>eşiniz</b>' : SEAT[wp]} ${cardStr(wc)} ile alıyor.`);
  } else lines.push(`Pozisyon: <b>${posTxt}</b> — rengi siz seçiyorsunuz.`);
  if (st.trump != null) {
    const vis = [viewer, ...(st.played.length ? [contract.declarer % 2 === viewer % 2 ? (viewer + 2) % 4 : (contract.declarer + 2) % 4] : [])];
    const seen = new Set(vis);
    const mineT = [...seen].reduce((a, s) => a + st.hands[s].filter(x => x.s === st.trump).length, 0);
    const out = 13 - st.played.filter(x => x.s === st.trump).length - mineT;
    lines.push(`Koz ${SUITS[st.trump]}: gördüğünüz ellerde ${mineT}, diğer iki elde toplam <b>${out}</b> koz kaldı.`);
  }
  const masters = st.hands[p].filter(c => isMaster(st, p, c));
  if (masters.length) lines.push(`Bu eldeki kesin kazananlar (renginin kalan en büyüğü): ${masters.map(cardStr).join(' ')}.`);
  return lines.map(l => `<li>${l}</li>`).join('');
}

export function explainPlay(st, p, viewer, contract, res) {
  const sorted = res.slice().sort((a, b) => b.v - a.v);
  const best = sorted[0];
  const why = cardReason(st, p, best.c, contract);
  const others = sorted.slice(1, 4).map(r => {
    const rr = cardReason(st, p, r.c, contract);
    const d = best.v - r.v;
    return `<li><b>${cardStr(r.c)}</b>: ort. ${r.v.toFixed(1)} löve ${d >= 0.3 ? `(<span class="neg">−${d.toFixed(1)}</span>)` : '(neredeyse aynı)'} — ${rr.name.toLowerCase()}</li>`;
  }).join('');
  const html = `<div class="co-head">Öneri: <b class="big">${cardStr(best.c)}</b> ${p === 2 ? '(Kuzey elinden)' : ''}</div>
    ${sec('1 · Durum', `<ul>${situation(st, p, contract, viewer)}</ul>`)}
    ${sec(`2 · İlke: ${why.name}`, `<p>${why.text}</p>`)}
    ${sec('3 · Seçenekler (simülasyon)', `<ul><li><b>${cardStr(best.c)}</b>: ort. <b>${best.v.toFixed(1)}</b> löve — en iyi</li>${others}</ul>
      <p class="hintline">Görmediğiniz kartların olası dağılımları tek tek oynatılarak her kartla tarafınızın ortalama kaç löve alacağı hesaplandı.</p>`)}`;
  return { card: best.c, html, lesson: why.lesson };
}

// Oyuncunun attığı karta geri bildirim
export function playFeedback(st, p, c, contract, res) {
  const best = res.reduce((a, b) => (b.v > a.v ? b : a));
  const mine = res.find(r => r.c.s === c.s && r.c.r === c.r);
  const myWhy = cardReason(st, p, c, contract);
  if (best.v - mine.v < 0.45) return { ok: true, html: `✓ İyi kart: <b>${cardStr(c)}</b> — ${myWhy.name.toLowerCase()}. <small>(ort. ${mine.v.toFixed(1)} löve)</small>` };
  const bw = cardReason(st, p, best.c, contract);
  return {
    ok: false, lesson: bw.lesson,
    html: `<b>${cardStr(best.c)}</b> daha iyiydi (ort. ${best.v.toFixed(1)} löve, sizinki ${mine.v.toFixed(1)}).<br>
      <b>Sizin kart:</b> ${myWhy.name}. <b>Önerilen:</b> ${bw.name} — ${bw.text}`,
  };
}

export function bidFeedback(auction, seat, hand, call, callEq) {
  const ex = explainBid(auction, seat, hand);
  if (callEq(ex.call, call)) return { ok: true, html: `✓ Doğru: <b>${bidStr(call)}</b> — ${esc(ex.expl)}` };
  const A = analyze(auction.concat([{ seat, call }]));
  const yours = A.expl[A.expl.length - 1];
  return {
    ok: false, lesson: ex.lesson,
    html: `Sizin <b>${bidStr(call)}</b>: ${esc(yours)}.<br>Sistemin önerisi <b>${bidStr(ex.call)}</b>: ${esc(ex.expl)}.<br><small>Eliniz ${hcp(hand)} HP; bu tür durumlarda kural için derse bakın.</small>`,
  };
}
