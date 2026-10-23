// Briç: deklarasyon (basitleştirilmiş Standart Amerikan), oyun sezgileri ve skor.
import { hcp, lengths, isBalanced, SUIT_NAMES } from './cards.js';
import { winHeur, isMaster, lowest, highest } from './engine.js';

export const STRAIN_SYM = ['♣', '♦', '♥', '♠', 'SA'];
export const suitOf = st => 3 - st;
export const strainOf = s => 3 - s;
const PASS = { t: 'p' }, DBL = { t: 'x' };
const B = (l, st) => ({ t: 'b', l, st });
const R = (call, expl) => ({ call, expl });
const rank = b => (b ? (b.l - 1) * 5 + b.st : -1);
const SN = s => SUIT_NAMES[s].toLowerCase();

export function bidStr(c) {
  if (c.t === 'p') return 'Pas';
  if (c.t === 'x') return 'Kontr';
  if (c.t === 'xx') return 'Sürkontr';
  return c.l + STRAIN_SYM[c.st];
}
export const callEq = (a, b) => a.t === b.t && (a.t !== 'b' || (a.l === b.l && a.st === b.st));

export function auctionState(auction) {
  let last = null, lastSeat = -1, dbl = 0;
  for (const a of auction) {
    if (a.call.t === 'b') { last = a.call; lastSeat = a.seat; dbl = 0; }
    else if (a.call.t === 'x') dbl = 1;
    else if (a.call.t === 'xx') dbl = 2;
  }
  return { last, lastSeat, dbl };
}

export function isLegal(auction, seat, call) {
  const { last, lastSeat, dbl } = auctionState(auction);
  if (call.t === 'p') return true;
  if (call.t === 'b') return call.l >= 1 && call.l <= 7 && rank(call) > rank(last);
  if (call.t === 'x') return !!last && dbl === 0 && lastSeat % 2 !== seat % 2;
  if (call.t === 'xx') return !!last && dbl === 1 && lastSeat % 2 === seat % 2;
  return false;
}

export function auctionOver(a) {
  if (a.length < 4) return false;
  if (!a.some(x => x.call.t !== 'p')) return true;
  return a.slice(-3).every(x => x.call.t === 'p');
}

export function finalContract(auction) {
  const s = auctionState(auction);
  if (!s.last) return null;
  const side = s.lastSeat % 2;
  const decl = auction.find(a => a.seat % 2 === side && a.call.t === 'b' && a.call.st === s.last.st).seat;
  return { l: s.last.l, st: s.last.st, dbl: s.dbl, declarer: decl };
}
export const contractStr = c => bidStr({ t: 'b', l: c.l, st: c.st }) + (c.dbl === 1 ? ' X' : c.dbl === 2 ? ' XX' : '');

// ---- el değerlendirme
export function handInfo(hand) { return { h: hcp(hand), L: lengths(hand), bal: isBalanced(hand), hand }; }
const supPts = (L, t) => L.reduce((a, n, s) => (s === t ? a : a + (n === 0 ? 5 : n === 1 ? 3 : n === 2 ? 1 : 0)), 0);
const lenPts = L => L.reduce((a, n) => a + Math.max(0, n - 4), 0);
function stopper(hand, s) {
  const cs = hand.filter(c => c.s === s), n = cs.length, has = r => cs.some(c => c.r === r);
  return has(14) || (has(13) && n >= 2) || (has(12) && n >= 3) || (has(11) && n >= 4);
}
const cheap = (st, last) => (!last ? 1 : st > last.st ? last.l : last.l + 1);

// ---- yorumlama: her deklarasyonun ne gösterdiği
function blank() { return { min: 0, max: 37, len: [0, 0, 0, 0], bal: false }; }
const setR = (I, a, b) => { I.min = Math.max(I.min, a); I.max = Math.min(I.max, b); if (I.max < I.min) I.max = I.min; };
const setL = (I, s, n) => { I.len[s] = Math.max(I.len[s], n); };

function interpret(before, seat, call, info, ctx) {
  const I = info[seat], pa = (seat + 2) % 4;
  const bids = before.filter(a => a.call.t === 'b');
  const mine = before.filter(a => a.seat === seat && a.call.t !== 'p');
  const pas = before.filter(a => a.seat === pa && a.call.t !== 'p');
  const last = bids.length ? bids[bids.length - 1] : null;
  if (call.t === 'p') {
    if (!bids.length) { setR(I, 0, 11); return 'Pas: açış için yetersiz (0-11 puan)'; }
    if (ctx.opener === pa && !mine.length && last.seat === pa && pas.length === 1) {
      const ob = ctx.openBid;
      if (ob.st === 4 && ob.l === 1) { setR(I, 0, 7); return 'Pas: 0-7 puan, 1SA yeterli'; }
      if (ob.l === 1) { setR(I, 0, 5); return 'Pas: 0-5 puan'; }
    }
    return 'Pas';
  }
  if (call.t === 'x') {
    if (last && last.seat % 2 !== seat % 2 && !mine.length && !pas.length && last.call.st < 4) {
      setR(I, 12, 37);
      const opp = new Set(bids.filter(a => a.seat % 2 !== seat % 2 && a.call.st < 4).map(a => suitOf(a.call.st)));
      for (let s = 0; s < 4; s++) if (!opp.has(s)) setL(I, s, 3);
      ctx.takeout = seat;
      return 'Kontr (takeout): 12+ puan, rakip renkte kısa, diğer renklere destek; eşini konuşmaya çağırır';
    }
    return 'Kontr (ceza): rakip kontratın batacağını düşünüyor';
  }
  if (call.t === 'xx') return 'Sürkontr: kontratı yapacağına güveniyor';
  const b = call, s = b.st < 4 ? suitOf(b.st) : -1, nm = bidStr(b);
  // AÇIŞ
  if (!bids.length) {
    ctx.opener = seat; ctx.openBid = b;
    if (b.st === 4) {
      I.bal = true;
      if (b.l === 1) { setR(I, 15, 17); return '1SA açış: 15-17 puan, dengeli el'; }
      if (b.l === 2) { setR(I, 20, 21); return '2SA açış: 20-21 puan, dengeli el'; }
      setR(I, 25, 27); return nm + ' açış: çok güçlü dengeli el';
    }
    if (b.l === 1) { setR(I, 12, 21); setL(I, s, s <= 1 ? 5 : 3); return `${nm} açış: 12-21 puan, ${s <= 1 ? '5+' : '3+'} ${SN(s)}`; }
    if (b.l === 2 && b.st === 0) { setR(I, 22, 37); return '2♣ açış: 22+ puan, güçlü ve yapay (sinek göstermez)'; }
    if (b.l === 2) { setR(I, 6, 10); setL(I, s, 6); return `${nm} zayıf iki: 6-10 puan, 6 kartlı ${SN(s)}`; }
    setR(I, 5, 10); setL(I, s, 7); return `${nm} engelleme (preempt): zayıf el, 7+ ${SN(s)}`;
  }
  // AÇANIN EŞİNİN İLK CEVABI
  if (ctx.opener === pa && !mine.length) {
    const ob = ctx.openBid;
    if (ob.st === 4 && ob.l === 1 && last.seat === pa) {
      if (b.l === 2 && b.st === 0) { ctx.conv = 'stayman'; setR(I, 8, 37); return '2♣ Stayman: 8+ puan, 4 kartlı majör (♥/♠) arıyor'; }
      if (b.l === 2 && b.st === 1) { ctx.conv = 'transH'; setL(I, 1, 5); return '2♦ transfer: 5+ kupa (açan 2♥ demeli)'; }
      if (b.l === 2 && b.st === 2) { ctx.conv = 'transS'; setL(I, 0, 5); return '2♥ transfer: 5+ maça (açan 2♠ demeli)'; }
      if (b.st === 4 && b.l === 2) { setR(I, 8, 9); I.bal = true; return '2SA: 8-9 puan, davet (açan max ise 3SA)'; }
      if (b.st === 4 && b.l === 3) { setR(I, 10, 15); I.bal = true; return '3SA: 10-15 puan, oyun (manş) için yeterli'; }
      if (s >= 0) { setL(I, s, 5); return `${nm}: 5+ ${SN(s)}`; }
    }
    if (ob.st === 0 && ob.l === 2 && b.l === 2 && b.st === 1) return '2♦: bekleme cevabı (yapay), açanın elini anlatmasını ister';
    if (ob.l === 1 && ob.st < 4) {
      const os = suitOf(ob.st);
      if (s === os) {
        setL(I, s, os <= 1 ? 3 : 4);
        if (b.l === 2) { setR(I, 6, 9); return `${nm}: basit destek, 6-9 puan`; }
        if (b.l === 3) { setR(I, 10, 12); return `${nm}: limit destek, 10-12 puan (davet)`; }
        setR(I, 13, 18); return `${nm}: manş desteği, 13+ puan`;
      }
      if (b.st === 4) {
        I.bal = true;
        if (b.l === 1) { setR(I, 6, 10); return '1SA cevap: 6-10 puan, uyum yok'; }
        if (b.l === 2) { setR(I, 11, 12); return '2SA cevap: 11-12 puan, dengeli'; }
        setR(I, 13, 15); return '3SA cevap: 13-15 puan, dengeli';
      }
      if (b.l === 1) { setR(I, 6, 37); setL(I, s, 4); return `${nm}: yeni renk 1 seviyede, 6+ puan, 4+ ${SN(s)} (zorlayıcı)`; }
      if (b.l === 2 && b.st < ob.st) { setR(I, 10, 37); setL(I, s, s === 1 ? 5 : 4); return `${nm}: 2 seviyede yeni renk, 10+ puan (zorlayıcı)`; }
    }
  }
  // AÇANIN YAPAY CEVAPLARI
  if (ctx.opener === seat && mine.length === 1 && ctx.conv) {
    if (ctx.conv === 'stayman') {
      ctx.conv = 'stayman2';
      if (b.l === 2 && b.st === 1) return '2♦: 4 kartlı majör yok';
      if (b.l === 2 && b.st === 2) { setL(I, 1, 4); return '2♥: 4 kupa var'; }
      if (b.l === 2 && b.st === 3) { setL(I, 0, 4); return '2♠: 4 maça var (4 kupa yok)'; }
    }
    if (ctx.conv === 'transH' || ctx.conv === 'transS') { ctx.conv += 'Done'; return `${nm}: transferi tamamlama`; }
  }
  // CEVAPLAYICININ TRANSFER/STAYMAN SONRASI İKİNCİ KONUŞMASI
  if (ctx.opener === pa && mine.length === 1 && /Done|stayman2/.test(ctx.conv || '')) {
    const ts = ctx.conv === 'transHDone' ? 1 : ctx.conv === 'transSDone' ? 0 : -1;
    ctx.conv = 'end';
    if (b.st === 4) { if (b.l === 2) { setR(I, 8, 9); return '2SA: 8-9 puan, davet'; } setR(I, 10, 15); return '3SA: 10-15 puan, oyun'; }
    if (s === ts) { setL(I, s, 6); if (b.l === 3) { setR(I, 8, 9); return `${nm}: 6+ kart, davet`; } setR(I, 10, 15); return `${nm}: 6+ kart, manş`; }
    if (s >= 0 && s <= 1) { setL(I, s, 4); if (b.l === 3) { setR(I, 8, 9); return `${nm}: uyum, davet`; } setR(I, 10, 15); return `${nm}: uyum, manş`; }
  }
  // ARA DEKLARASYON (rakip açtı, bizim taraf ilk kez konuşuyor)
  if (ctx.opener >= 0 && ctx.opener % 2 !== seat % 2 && !mine.length && !pas.length) {
    if (b.st === 4 && b.l === 1) { setR(I, 15, 18); I.bal = true; return '1SA ara deklarasyon: 15-18 puan, dengeli, rakip renkte durdurucu'; }
    const c = cheap(b.st, last.call);
    if (b.l > c) { setR(I, 6, 10); setL(I, s, 6); return `${nm}: zayıf atlamalı ara deklarasyon, 6+ ${SN(s)}`; }
    setR(I, 8, 16); setL(I, s, 5); return `${nm}: ara deklarasyon, 8-16 puan, 5+ ${SN(s)}`;
  }
  // GENEL
  if (b.st === 4) {
    I.bal = true;
    if (ctx.opener === seat && mine.length === 1) {
      const c = cheap(4, last.call);
      if (b.l === c && b.l <= 2) { setR(I, 12, 14); return `${nm}: minimum dengeli el (12-14)`; }
      if (b.l === c + 1) { setR(I, 18, 19); return `${nm}: atlamalı, 18-19 puan dengeli`; }
    }
    return `${nm}: sanzatu, durdurucular var`;
  }
  const myBefore = before.some(a => a.seat === seat && a.call.t === 'b' && a.call.st === b.st);
  const paBefore = before.some(a => a.seat === pa && a.call.t === 'b' && a.call.st === b.st);
  if (myBefore) { setL(I, s, 6); return `${nm}: rengini tekrar, 6+ ${SN(s)}`; }
  if (paBefore) { setL(I, s, 3); return `${nm}: eşinin rengine destek`; }
  setL(I, s, 4); return `${nm}: yeni renk, 4+ ${SN(s)}`;
}

export function analyze(auction) {
  const info = [0, 1, 2, 3].map(blank);
  const ctx = { opener: -1, openBid: null, conv: null };
  const expl = auction.map((a, i) => interpret(auction.slice(0, i), a.seat, a.call, info, ctx));
  return { info, ctx, expl };
}

// ---- karar: AI hangi deklarasyonu yapar
function opening(me) {
  const { h, L, bal } = me;
  if (h >= 22) return R(B(2, 0), '2♣ açış: 22+ puan, güçlü yapay açış');
  if (bal && h >= 20 && h <= 21) return R(B(2, 4), '2SA açış: 20-21 puan dengeli');
  if (bal && h >= 15 && h <= 17) return R(B(1, 4), '1SA açış: 15-17 puan dengeli');
  const two = L.slice().sort((a, b) => b - a);
  if (h >= 12 || (h >= 11 && h + two[0] + two[1] >= 20)) {
    if (L[0] >= 5 && L[0] >= L[1]) return R(B(1, 3), `1♠ açış: ${h} puan, 5+ maça`);
    if (L[1] >= 5) return R(B(1, 2), `1♥ açış: ${h} puan, 5+ kupa`);
    if (L[2] > L[3] || (L[2] === L[3] && L[2] >= 4)) return R(B(1, 1), `1♦ açış: ${h} puan, 5 kartlı majör yok, uzun minör karo`);
    return R(B(1, 0), `1♣ açış: ${h} puan, 5 kartlı majör yok, uzun minör sinek`);
  }
  if (h >= 5 && h <= 10) {
    for (const s of [0, 1, 2]) if (L[s] === 6) return R(B(2, strainOf(s)), `2${STRAIN_SYM[strainOf(s)]} zayıf iki: ${h} puan, 6 ${SN(s)}`);
    for (const s of [0, 1, 2, 3]) if (L[s] >= 7) return R(B(3, strainOf(s)), `3${STRAIN_SYM[strainOf(s)]} engelleme: 7+ ${SN(s)}, zayıf el`);
  }
  return R(PASS, `Pas: ${h} puan, açış için 12+ puan gerekir`);
}

function respond1Suit(me, ps) {
  const { h, L, bal } = me;
  if (h < 6) return R(PASS, `Pas: ${h} puan, cevap için 6+ gerekir`);
  const pst = strainOf(ps);
  if (ps <= 1 && L[ps] >= 3) {
    const d = h + supPts(L, ps);
    if (d >= 13) return R(B(4, pst), `4${STRAIN_SYM[pst]}: ${L[ps]} kart destek, ${d} destek puanı → manş`);
    if (d >= 10) return R(B(3, pst), `3${STRAIN_SYM[pst]}: limit destek, ${d} destek puanı (davet)`);
    return R(B(2, pst), `2${STRAIN_SYM[pst]}: basit destek, ${d} destek puanı`);
  }
  const majors = [1, 0].filter(s => L[s] >= 4 && strainOf(s) > pst);
  if (majors.length) {
    const s = majors.length === 2 && L[0] > L[1] ? 0 : majors[0];
    return R(B(1, strainOf(s)), `1${STRAIN_SYM[strainOf(s)]}: 6+ puan, 4+ ${SN(s)} (önce majörü göster)`);
  }
  if (ps === 3 && L[2] >= 4 && !(bal && h >= 11)) return R(B(1, 1), '1♦: 6+ puan, 4+ karo');
  if (bal && h >= 13 && h <= 15) return R(B(3, 4), `3SA: ${h} puan dengeli`);
  if (bal && h >= 11 && h <= 12) return R(B(2, 4), `2SA: ${h} puan dengeli, davet`);
  if (ps >= 2 && L[ps] >= 5) {
    if (h <= 9) return R(B(2, pst), `2${STRAIN_SYM[pst]}: minör destek, 6-9 puan`);
    if (h <= 12) return R(B(3, pst), `3${STRAIN_SYM[pst]}: minör limit destek, 10-12 puan`);
  }
  if (h >= 10) {
    let best = -1;
    for (let s = 0; s < 4; s++) if (strainOf(s) < pst && L[s] >= (s === 1 ? 5 : 4) && (best < 0 || L[s] > L[best])) best = s;
    if (best >= 0) return R(B(2, strainOf(best)), `2${STRAIN_SYM[strainOf(best)]}: 10+ puan, ${L[best]} ${SN(best)} (zorlayıcı)`);
  }
  if (h <= 10) return R(B(1, 4), `1SA: ${h} puan, uyum yok`);
  return R(B(h >= 13 ? 3 : 2, 4), `${h >= 13 ? 3 : 2}SA: ${h} puan`);
}

function respond1NT(me) {
  const { h, L } = me;
  if (L[0] >= 5 && L[0] >= L[1]) return R(B(2, 2), '2♥ transfer: 5+ maça var, açana 2♠ dedirtir');
  if (L[1] >= 5) return R(B(2, 1), '2♦ transfer: 5+ kupa var, açana 2♥ dedirtir');
  if (h >= 8 && (L[0] === 4 || L[1] === 4)) return R(B(2, 0), '2♣ Stayman: 8+ puan ve 4 kartlı majör');
  if (h <= 7) return R(PASS, `Pas: ${h} puan, toplam manşa yetmez`);
  if (h <= 9) return R(B(2, 4), `2SA: ${h} puan, davet`);
  if (h <= 17) return R(B(3, 4), `3SA: ${h} puan, toplam 25+ → manş`);
  return R(B(6, 4), `6SA: ${h} puan, toplam 33+ → küçük şlem`);
}

function overcall(me, last, hand, oppSuit) {
  const { h, L, bal } = me;
  if (last.st === 4) return R(PASS, 'Pas');
  if (bal && h >= 15 && h <= 18 && last.l === 1 && stopper(hand, oppSuit)) return R(B(1, 4), `1SA ara deklarasyon: ${h} puan, dengeli, durdurucu var`);
  let best = -1;
  for (let s = 0; s < 4; s++) if (s !== oppSuit && L[s] >= 5 && (best < 0 || L[s] > L[best] || (L[s] === L[best] && s < best))) best = s;
  if (best >= 0 && h >= 8 && h <= 16) {
    const lv = cheap(strainOf(best), last);
    if (lv === 1 || (lv === 2 && h >= 10)) return R(B(lv, strainOf(best)), `${lv}${STRAIN_SYM[strainOf(best)]} ara deklarasyon: ${h} puan, ${L[best]} ${SN(best)}`);
  }
  const others = [0, 1, 2, 3].filter(s => s !== oppSuit);
  if (last.l <= 2 && ((h >= 12 && L[oppSuit] <= 2 && others.every(s => L[s] >= 3)) || h >= 17))
    return R(DBL, `Kontr (takeout): ${h} puan, ${SN(oppSuit)} kısa, eşinden renk ister`);
  return R(PASS, `Pas: ${h} puan, uygun ara deklarasyon yok`);
}

function advanceTakeout(me, st, hand, oppSuits, forced) {
  const { h, L } = me;
  const unbid = [0, 1, 2, 3].filter(s => !oppSuits.has(s));
  if (!forced) {
    const s5 = unbid.find(s => L[s] >= 5);
    if (h >= 6 && s5 !== undefined && cheap(strainOf(s5), st.last) <= 2) return R(B(cheap(strainOf(s5), st.last), strainOf(s5)), `Rengini gösteriyor: 5+ ${SN(s5)}`);
    return R(PASS, 'Pas: rakip araya girdi, zorunluluk kalktı');
  }
  const os = [...oppSuits][0];
  if (h >= 8 && h <= 10 && me.bal && os !== undefined && stopper(hand, os) && cheap(4, st.last) === 1) return R(B(1, 4), `1SA: ${h} puan, rakip renkte durdurucu`);
  let best = unbid[0];
  for (const s of unbid) { const sc = L[s] + (s <= 1 ? 0.5 : 0), bs = L[best] + (best <= 1 ? 0.5 : 0); if (sc > bs) best = s; }
  const stn = strainOf(best);
  let lv = cheap(stn, st.last);
  if (h >= 12 && best <= 1 && L[best] >= 4) return R(B(4, stn), `4${STRAIN_SYM[stn]}: ${h} puan, manş`);
  if (h >= 9 && lv <= 2) lv++;
  return R(B(lv, stn), `${lv}${STRAIN_SYM[stn]}: eşin kontr etti, en uzun renk (${L[best]} ${SN(best)})${h >= 9 ? ', atlama = 9-11 puan' : ''}`);
}

function pickTarget(total, fit, me, P) {
  if (fit >= 0 && fit <= 1) return { l: total >= 37 ? 7 : total >= 33 ? 6 : total >= 25 ? 4 : total >= 23 ? 3 : 2, st: strainOf(fit) };
  if (fit >= 2) {
    if (total >= 33) return { l: total >= 37 ? 7 : 6, st: strainOf(fit) };
    if (total >= 25 && (me.bal || P.bal || total < 29)) return { l: 3, st: 4 };
    if (total >= 29) return { l: 5, st: strainOf(fit) };
    return { l: total >= 22 ? 3 : 2, st: strainOf(fit) };
  }
  const long = [0, 1, 2, 3].find(s => me.L[s] >= 6);
  if (long !== undefined && !me.bal) {
    if (total >= 25) return long <= 1 ? { l: 4, st: strainOf(long) } : { l: 3, st: 4 };
    return { l: total >= 22 ? 3 : 2, st: strainOf(long) };
  }
  return { l: total >= 37 ? 7 : total >= 33 ? 6 : total >= 25 ? 3 : total >= 23 ? 2 : 1, st: 4 };
}

function generic(o) {
  const { me, info, seat, auction, st, ctx } = o;
  const pa = (seat + 2) % 4, P = info[pa], Me = info[seat];
  const ourSide = st.lastSeat >= 0 && st.lastSeat % 2 === seat % 2;
  const partnerBid = auction.some(a => a.seat === pa && a.call.t !== 'p');
  const iBid = auction.some(a => a.seat === seat && a.call.t !== 'p');
  if (!partnerBid && !iBid) return R(PASS, 'Pas');
  if (!partnerBid) {
    const s6 = [0, 1, 2, 3].find(s => me.L[s] >= 6);
    if (s6 !== undefined && me.h >= 12) { const lv = cheap(strainOf(s6), st.last); if (lv <= 2) return R(B(lv, strainOf(s6)), `Uzun rengini tekrar: ${me.L[s6]} ${SN(s6)}`); }
    return R(PASS, 'Pas: eş zayıf');
  }
  const pEst = P.max - P.min <= 5 ? (P.min + P.max) / 2 : P.min + 1.5;
  let fit = -1, fitLen = 0;
  for (let s = 0; s < 4; s++) {
    const t = me.L[s] + P.len[s];
    if (P.len[s] > 0 && t >= 8) {
      const sc = t + (s <= 1 ? 1.5 : 0), bs = fitLen + (fit >= 0 && fit <= 1 ? 1.5 : 0);
      if (fit < 0 || sc > bs) { fit = s; fitLen = t; }
    }
  }
  const dist = fit >= 0 && P.len[fit] >= me.L[fit] ? supPts(me.L, fit) : lenPts(me.L);
  const total = me.h + Math.min(dist, 4) + pEst;
  const pLast = [...auction].reverse().find(a => a.seat === pa);
  // davete cevap
  if (pLast && pLast.call.t === 'b' && st.lastSeat === pa && iBid) {
    const c = pLast.call;
    const inv = (c.st === 4 && c.l === 2) || (c.l === 3 && c.st >= 2 && c.st <= 3 && fit === suitOf(c.st));
    if (inv) {
      const thr = Me.min + Math.min(3, (Math.min(Me.max, Me.min + 9) - Me.min) / 2);
      if (me.h + Math.min(dist, 3) >= thr) {
        const g = c.st === 4 ? B(3, 4) : B(4, c.st);
        return R(g, `${bidStr(g)}: davet kabul — elim aralığın üst kısmında (${me.h} puan)`);
      }
      return R(PASS, `Pas: davet reddedildi, elim minimum (${me.h} puan)`);
    }
  }
  const T = pickTarget(total, fit, me, P);
  if (fit >= 0 && T.l <= 3 && st.lastSeat % 2 !== seat % 2 && T.st === strainOf(fit)) T.l = Math.max(T.l, Math.min(3, fitLen - 6));
  const why = `ortak puan tahmini ~${Math.round(total)}${fit >= 0 ? `, ${SN(fit)} uyumu (${fitLen} kart)` : ', majör uyumu yok'}`;
  const forcing = ctx.opener === seat && pLast && pLast.call.t === 'b' && st.lastSeat === pa && pLast.call.st < 4 &&
    !auction.some(a => a.seat === seat && a.call.t === 'b' && a.call.st === pLast.call.st) &&
    auction.filter(a => a.seat === pa && a.call.t === 'b').length === 1 && pLast.call.l <= 2;
  if (ourSide && st.last.st === T.st && st.last.l >= T.l && !forcing) return R(PASS, `Pas: mevcut kontrat yeterli (${why})`);
  if (rank(T) > rank(st.last) && !(ourSide && st.last.st === T.st && st.last.l >= T.l)) {
    if (me.h < 5 && !forcing) return R(PASS, 'Pas: çok zayıf el');
    const tb = B(T.l, T.st);
    return R(tb, `${bidStr(tb)}: ${why}`);
  }
  if (forcing) {
    const ps = suitOf(pLast.call.st);
    const opts = [];
    if (me.L[ps] >= (ps <= 1 ? 4 : 4)) opts.push([pLast.call.st, `eşin rengine destek`]);
    const mySuits = [0, 1, 2, 3].filter(s => me.L[s] >= 5).sort((a, b) => me.L[b] - me.L[a]);
    mySuits.forEach(s => opts.push([strainOf(s), `rengini tekrar (${me.L[s]} kart)`]));
    opts.push([4, 'sanzatu, minimum el']);
    for (const [stn, t] of opts) { const lv = cheap(stn, st.last); if (lv <= 3) { const bb = B(lv, stn); return R(bb, `${bidStr(bb)}: eşin yeni rengi zorlayıcı — ${t}`); } }
  }
  if (!ourSide && st.dbl === 0 && st.last.l >= 2 && total >= 23) {
    const ts = st.last.st === 4 ? -1 : suitOf(st.last.st);
    if ((ts >= 0 && me.L[ts] >= 4) || (ts < 0 && me.h >= 13)) return R(DBL, `Kontr (ceza): ${why}, rakip kozunda ${ts >= 0 ? me.L[ts] + ' kart' : 'güç'} var`);
  }
  return R(PASS, `Pas: ${why}`);
}

export function chooseBid(auction, seat, hand) {
  const A = analyze(auction), info = A.info, ctx = A.ctx;
  const me = handInfo(hand), pa = (seat + 2) % 4, st = auctionState(auction);
  const myN = auction.filter(a => a.seat === seat && a.call.t !== 'p');
  const paN = auction.filter(a => a.seat === pa && a.call.t !== 'p');
  const myB = auction.filter(a => a.seat === seat && a.call.t === 'b');
  let r = null;
  if (!st.last) r = opening(me);
  else if (ctx.opener === pa && !myN.length) {
    const ob = ctx.openBid;
    if (ob.l === 1 && ob.st < 4) r = respond1Suit(me, suitOf(ob.st));
    else if (ob.l === 1 && ob.st === 4 && st.lastSeat === pa) r = respond1NT(me);
    else if (ob.l === 2 && ob.st === 4 && st.lastSeat === pa) {
      if (me.h >= 4 && me.L[0] >= 5) r = R(B(4, 3), '4♠: 5+ maça, manş');
      else if (me.h >= 4 && me.L[1] >= 5) r = R(B(4, 2), '4♥: 5+ kupa, manş');
      else if (me.h >= 12) r = R(B(6, 4), '6SA: toplam 32+, şlem');
      else if (me.h >= 5) r = R(B(3, 4), '3SA: toplam 25+');
      else r = R(PASS, 'Pas: çok zayıf');
    } else if (ob.l === 2 && ob.st === 0) r = R(B(2, 1), '2♦: bekleme cevabı (yapay)');
    else if (ob.st < 4) {
      const ps = suitOf(ob.st);
      if (ps <= 1 && me.L[ps] >= 3 && me.h >= 14) r = R(B(4, ob.st), `4${STRAIN_SYM[ob.st]}: destek + ${me.h} puan`);
      else if (me.h >= 16 && me.bal) r = R(B(3, 4), `3SA: ${me.h} puan dengeli`);
      else r = R(PASS, 'Pas: eşin engelleme açışına yük bindirme');
    }
  } else if (ctx.opener === seat && myB.length === 1 && st.lastSeat === pa && ['stayman', 'transH', 'transS'].includes(ctx.conv)) {
    if (ctx.conv === 'stayman') r = me.L[1] >= 4 ? R(B(2, 2), '2♥: 4 kupa var') : me.L[0] >= 4 ? R(B(2, 3), '2♠: 4 maça var') : R(B(2, 1), '2♦: 4 kartlı majör yok');
    else r = ctx.conv === 'transH' ? R(B(2, 2), '2♥: transferi tamamlama (zorunlu)') : R(B(2, 3), '2♠: transferi tamamlama (zorunlu)');
  } else if (ctx.opener === pa && myB.length === 1 && st.lastSeat === pa && ['stayman2', 'transHDone', 'transSDone'].includes(ctx.conv)) {
    const h = me.h;
    if (ctx.conv === 'stayman2') {
      const rs = suitOf(st.last.st);
      if (st.last.st >= 2 && me.L[rs] >= 4) r = h <= 9 ? R(B(3, st.last.st), `3${STRAIN_SYM[st.last.st]}: majör uyumu, davet`) : R(B(4, st.last.st), `4${STRAIN_SYM[st.last.st]}: majör uyumu, manş`);
      else r = h <= 9 ? R(B(2, 4), '2SA: uyum yok, davet') : R(B(3, 4), '3SA: uyum yok, manş');
    } else {
      const s = ctx.conv === 'transHDone' ? 1 : 0, stn = strainOf(s);
      if (h < 8) r = R(PASS, `Pas: zayıf el, 2${STRAIN_SYM[stn]} oynansın`);
      else if (h <= 9) r = me.L[s] >= 6 ? R(B(3, stn), `3${STRAIN_SYM[stn]}: 6+ kart, davet`) : R(B(2, 4), '2SA: 5 kart, davet');
      else r = me.L[s] >= 6 ? R(B(4, stn), `4${STRAIN_SYM[stn]}: 6+ kart, manş`) : R(B(3, 4), '3SA: 5 kart, manş (açan seçsin)');
    }
  } else if (ctx.opener >= 0 && ctx.opener % 2 !== seat % 2 && !myN.length && !paN.length) {
    const oppSuit = st.last.st < 4 ? suitOf(st.last.st) : 0;
    r = overcall(me, st.last, hand, oppSuit);
  } else if (ctx.opener % 2 !== seat % 2 && paN.length && !myN.length && ctx.takeout === pa) {
    const oppSuits = new Set(auction.filter(a => a.seat % 2 !== seat % 2 && a.call.t === 'b' && a.call.st < 4).map(a => suitOf(a.call.st)));
    const forced = st.dbl === 1 && auction[auction.length - 1].call.t === 'p';
    r = advanceTakeout(me, st, hand, oppSuits, forced);
  }
  if (!r || !isLegal(auction, seat, r.call)) r = generic({ me, info, seat, auction, st, ctx, hand });
  if (!isLegal(auction, seat, r.call)) r = R(PASS, 'Pas');
  return r;
}

// ---- oyun
function bridgeLead(contract) {
  const trump = contract.st === 4 ? null : suitOf(contract.st);
  const declSide = contract.declarer % 2;
  return (st, p, legal) => {
    const isDecl = p % 2 === declSide, part = (p + 2) % 4;
    const bySuit = s => legal.filter(c => c.s === s);
    if (isDecl && trump != null) {
      const myT = bySuit(trump);
      const ourT = st.hands[p].filter(c => c.s === trump).length + st.hands[part].filter(c => c.s === trump).length;
      const out = 13 - st.played.filter(c => c.s === trump).length - ourT;
      if (myT.length && out > 0) {
        const m = myT.filter(c => isMaster(st, p, c));
        if (m.length) return highest(m);
        if (ourT >= 8) return lowest(myT);
      }
    }
    const masters = legal.filter(c => c.s !== trump && isMaster(st, p, c));
    if (masters.length && (isDecl || st.tricks.length > 0 || masters.some(c => c.r === 14))) return highest(masters);
    if (!isDecl) {
      const pl = st.tricks.find(t => t.cards[0].p === part);
      if (pl) { const s = pl.cards[0].c.s, cs = bySuit(s); if (cs.length && s !== trump) return cs.length <= 2 ? highest(cs) : lowest(cs); }
    }
    for (const s of [0, 1, 2, 3]) {
      if (s === trump) continue;
      const cs = bySuit(s).sort((a, b) => b.r - a.r);
      if (cs.length >= 2 && cs[0].r >= 11 && cs[1].r === cs[0].r - 1) return cs[0];
    }
    let bs = -1;
    for (const s of [0, 1, 2, 3]) { if (s === trump) continue; const n = bySuit(s).length; if (n && (bs < 0 || n > bySuit(bs).length)) bs = s; }
    if (bs < 0) return lowest(legal);
    const cs = bySuit(bs).sort((a, b) => b.r - a.r);
    if (trump == null && cs.length >= 4) return cs[3];
    return cs[cs.length - 1];
  };
}

export function bridgeRules(contract) {
  const trump = contract.st === 4 ? null : suitOf(contract.st);
  const lead = bridgeLead(contract);
  return {
    samples: 24,
    legal(st, p) {
      const h = st.hands[p];
      if (!st.trick.length) return h.slice();
      const f = h.filter(c => c.s === st.trick[0].c.s);
      return f.length ? f : h.slice();
    },
    heuristic: (st, p) => winHeur(st, p, trump, (p + 2) % 4, lead),
    evaluate: (st, p) => st.won[p % 2] + st.won[(p % 2) + 2],
  };
}

// ---- skor (duplicate)
export function scoreDeal(c, tricks, vul) {
  const diff = tricks - (6 + c.l), m = c.dbl === 0 ? 1 : c.dbl === 1 ? 2 : 4;
  if (diff >= 0) {
    const per = c.st <= 1 ? 20 : 30;
    const tp = (per * c.l + (c.st === 4 ? 10 : 0)) * m;
    let s = tp + (tp >= 100 ? (vul ? 500 : 300) : 50);
    if (c.l === 6) s += vul ? 750 : 500;
    if (c.l === 7) s += vul ? 1500 : 1000;
    if (c.dbl === 1) s += 50;
    if (c.dbl === 2) s += 100;
    s += c.dbl === 0 ? diff * per : diff * (vul ? 200 : 100) * (c.dbl === 2 ? 2 : 1);
    return s;
  }
  const d = -diff;
  if (c.dbl === 0) return -d * (vul ? 100 : 50);
  let pen = 0;
  for (let i = 1; i <= d; i++) pen += vul ? (i === 1 ? 200 : 300) : i === 1 ? 100 : i <= 3 ? 200 : 300;
  return -pen * (c.dbl === 2 ? 2 : 1);
}
