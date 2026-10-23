import { SUITS, SUIT_NAMES, cardStr, rankStr, isRed, dealHands, hcp, lengths, sameCard, isBalanced } from './cards.js';
import { newTrickState, playCard, isOver, chooseCard, analyzeMoves, trickWinner } from './engine.js';
import {
  chooseBid, isLegal, auctionOver, analyze, bidStr, callEq, bridgeRules, scoreDeal, STRAIN_SYM,
  finalContract, contractStr, suitOf,
} from './bridge.js';
import { KING_GAMES, kingRules, kingScores, kingOptions, kingChooseGame } from './king.js';
import { LESSONS, KING_RULES } from './lessons.js';

const app = document.getElementById('app');
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LEVELS = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };
const SEAT = ['Güney (Siz)', 'Batı', 'Kuzey', 'Doğu'];
const SHORT = ['G', 'B', 'K', 'D'];
const POS = ['s', 'w', 'n', 'e'];
// el numarasına göre dağıtan ve zon (0 G, 1 B, 2 K, 3 D)
const DEALER = [2, 3, 0, 1];
const VUL = [[0,0],[1,0],[0,1],[1,1],[1,0],[0,1],[1,1],[0,0],[0,1],[1,1],[0,0],[1,0],[1,1],[0,0],[1,0],[0,1]];
let g = null;          // aktif oyun
let view = 'menu';
const setup = { level: 'medium', tutor: true, team: true };
let learnSel = 0;
let quiz = null;
const THEMES = [['classic', 'Klasik'], ['modern', 'Modern'], ['vintage', 'Vintage'], ['royal', 'Kraliyet'], ['night', 'Gece']];
const BACKS = [['bordo', 'Bordo'], ['navy', 'Lacivert'], ['green', 'Zümrüt'], ['gold', 'Altın Art Deco'], ['black', 'Siyah Karbon'], ['tulip', 'Lale']];
const FELTS = [['green', 'Klasik yeşil'], ['blue', 'Okyanus mavisi'], ['red', 'Kumarhane bordosu'], ['purple', 'Mor kadife'], ['wood', 'Ceviz ahşap'], ['dark', 'Antrasit'], ['marble', 'Mermer'], ['turkish', 'Çini desen']];
const look = { theme: 'classic', back: 'bordo', four: false, big: false, felt: 'green' };
try { Object.assign(look, JSON.parse(localStorage.getItem('cardLook') || '{}')); } catch (e) {}
let customImg = null;
try { customImg = localStorage.getItem('tableImg'); } catch (e) {}
function applyLook() {
  const b = document.body;
  [...b.classList].filter(c => /^(th|bk|tb)-/.test(c) || c === 'fourcolor' || c === 'bigidx').forEach(c => b.classList.remove(c));
  if (look.felt === 'custom' && !customImg) look.felt = 'green';
  b.classList.add('th-' + look.theme, 'bk-' + look.back, 'tb-' + look.felt);
  if (look.four) b.classList.add('fourcolor');
  if (look.big) b.classList.add('bigidx');
  if (customImg) b.style.setProperty('--table-img', `url("${customImg}")`); else b.style.removeProperty('--table-img');
  try { localStorage.setItem('cardLook', JSON.stringify(look)); } catch (e) {}
}
// Bilgisayardan seçilen resmi küçültüp (en fazla 1600px, JPEG) sakla
function loadTableImage(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    customImg = cv.toDataURL('image/jpeg', 0.85);
    try { localStorage.setItem('tableImg', customImg); } catch (e) { /* kota dolarsa yalnız bu oturumda kalır */ }
    look.felt = 'custom';
    applyLook();
    render();
  };
  img.src = url;
}
applyLook();

// ---------------- kart çizimi ----------------
// Gerçek iskambil pip düzenleri (x%, y%)
const PIPS = {
  2: [[50, 16], [50, 84]],
  3: [[50, 16], [50, 50], [50, 84]],
  4: [[30, 16], [70, 16], [30, 84], [70, 84]],
  5: [[30, 16], [70, 16], [50, 50], [30, 84], [70, 84]],
  6: [[30, 16], [70, 16], [30, 50], [70, 50], [30, 84], [70, 84]],
  7: [[30, 16], [70, 16], [50, 33], [30, 50], [70, 50], [30, 84], [70, 84]],
  8: [[30, 16], [70, 16], [50, 33], [30, 50], [70, 50], [50, 67], [30, 84], [70, 84]],
  9: [[30, 16], [70, 16], [30, 39], [70, 39], [50, 50], [30, 61], [70, 61], [30, 84], [70, 84]],
  10: [[30, 16], [70, 16], [50, 28], [30, 39], [70, 39], [30, 61], [70, 61], [50, 72], [30, 84], [70, 84]],
};
const FACE_ICON = { 11: '♞', 12: '♛', 13: '♚' };
const FACE_NAME = { 11: 'VALE', 12: 'KIZ', 13: 'PAPAZ' };
function cardHTML(c, cls = '', attrs = '') {
  const r = rankStr(c.r), s = SUITS[c.s];
  const face = c.r >= 11 && c.r <= 13;
  let art;
  if (face) {
    art = `<div class="art face-art"><span class="wm">${s}</span><span class="fi">${FACE_ICON[c.r]}</span><span class="fl">${r}${s}</span><span class="fn">${FACE_NAME[c.r]}</span></div>`;
  } else if (c.r === 14) {
    art = `<div class="art ace-art"><span>${s}</span></div>`;
  } else {
    art = `<div class="art pips">${PIPS[c.r].map(([x, y]) => `<i style="left:${x}%;top:${y}%"${y > 50 ? ' class="flip"' : ''}>${s}</i>`).join('')}</div>`;
  }
  return `<div class="card s${c.s} ${isRed(c.s) ? 'red' : ''} ${face ? 'face' : ''} ${c.r === 14 ? 'ace' : ''} ${cls}" ${attrs} aria-label="${SUIT_NAMES[c.s]} ${r}">
    <div class="idx tl">${r}<span>${s}</span></div>${art}<div class="idx br">${r}<span>${s}</span></div></div>`;
}
const backsHTML = (n, vertical) => `<div class="backs ${vertical ? 'v' : ''}">${'<div class="card back"></div>'.repeat(Math.min(n, vertical ? 7 : 13))}</div>`;
function suitLines(hand) {
  return `<div class="suitlines">${[0, 1, 3, 2].map(s => `<div class="${isRed(s) ? 'red' : ''}">${SUITS[s]} ${hand.filter(c => c.s === s).map(c => rankStr(c.r)).join(' ') || '—'}</div>`).join('')}</div>`;
}
function handRow(hand, seat, legal, hintCard) {
  return `<div class="hand ${hand.length <= 8 ? 'loose' : ''}">${hand.map((c, i) => {
    let cls = '';
    if (legal) cls = legal.some(x => sameCard(x, c)) ? 'playable' : 'dim';
    if (hintCard && sameCard(hintCard, c)) cls += ' hint';
    return cardHTML(c, cls, legal ? `data-act="card" data-seat="${seat}" data-i="${i}" tabindex="0"` : '');
  }).join('')}</div>`;
}
function trickHTML(trick, winner) {
  const slots = [0, 1, 2, 3].map(p => {
    const t = trick.find(x => x.p === p);
    return `<div class="slot ${POS[p]} ${winner === p ? 'win' : ''}">${t ? cardHTML(t.c) : ''}</div>`;
  });
  return `<div class="trick">${slots.join('')}</div>`;
}

// ---------------- ekranlar ----------------
function render() {
  if (view === 'menu') app.innerHTML = menuHTML();
  else if (view === 'bsetup') app.innerHTML = setupHTML('bridge');
  else if (view === 'ksetup') app.innerHTML = setupHTML('king');
  else if (view === 'learn') app.innerHTML = learnHTML();
  else if (view === 'cards') app.innerHTML = cardsHTML();
  else if (view === 'game') app.innerHTML = g.kind === 'bridge' ? bridgeHTML() : kingHTML();
}

function menuHTML() {
  const fan = cs => `<div class="fan">${cs.map(c => cardHTML(c)).join('')}</div>`;
  return `<section class="menu">
    <h1>Bilgisayara karşı oyna</h1><p class="sub">Briç ve King — üç zorluk seviyesi, oynarken öğreten ipuçlarıyla.</p>
    <div class="tiles">
      <button class="tile" data-act="bsetup">${fan([{ s: 0, r: 14 }, { s: 1, r: 13 }, { s: 2, r: 12 }, { s: 3, r: 11 }])}
        <h2>Briç</h2><p>Deklarasyon ve oyun. Eşiniz Kuzey; rakipler Doğu–Batı.</p></button>
      <button class="tile" data-act="ksetup">${fan([{ s: 1, r: 13 }, { s: 0, r: 12 }, { s: 1, r: 12 }, { s: 3, r: 13 }])}
        <h2>King</h2><p>Tekli veya eşli King: 20 oyun, cezalar ve kozlar.</p></button>
      <button class="tile" data-act="tutorplay">${fan([{ s: 2, r: 10 }, { s: 2, r: 11 }, { s: 2, r: 12 }, { s: 2, r: 13 }])}
        <h2>Oynayarak Öğren</h2><p>Her deklarasyonda ve kartta açıklama, öneri ve geri bildirim.</p></button>
      <button class="tile" data-act="learn">${fan([{ s: 3, r: 14 }, { s: 3, r: 2 }, { s: 0, r: 7 }, { s: 1, r: 9 }])}
        <h2>Dersler & Alıştırmalar</h2><p>Puan sayma, açış, cevap ve oyun teknikleri; quizler.</p></button>
    </div></section>`;
}

function setupHTML(kind) {
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, t]) => `<button data-act="set" data-k="${key}" data-v="${v}" class="${String(setup[key]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const lv = seg('level', [['easy', 'Kolay'], ['medium', 'Orta'], ['hard', 'Zor']]);
  if (kind === 'bridge') return `<section class="setup"><div class="box"><h2>Briç</h2>
    <div class="opt"><label class="t">Zorluk</label>${lv}<p class="hintline">Kolay: rakipler sık hata yapar · Orta: temel teknikler · Zor: her kartta binlerce olasılığı simüle eder.</p></div>
    <div class="opt"><label class="check"><input type="checkbox" data-act="tutor" ${setup.tutor ? 'checked' : ''}> <span><b>Öğretici mod</b><br><span class="hintline">Deklarasyon ve kartlarınıza anında geri bildirim, el analizi.</span></span></label></div>
    <button class="btn primary" data-act="startbridge">Oyunu başlat</button> <button class="btn light" data-act="menu">Geri</button></div></section>`;
  return `<section class="setup"><div class="box"><h2>King</h2>
    <div class="opt"><label class="t">Oyun türü</label>${seg('team', [['false', 'Tekli King'], ['true', 'Eşli King']])}</div>
    <div class="opt"><label class="t">Zorluk</label>${lv}</div>
    <button class="btn primary" data-act="startking">Oyunu başlat</button> <button class="btn light" data-act="menu">Geri</button>
    <details style="margin-top:14px"><summary><b>Kurallar</b></summary>${KING_RULES}</details></div></section>`;
}

// ---------------- BRİÇ ----------------
function startBridge(opt) {
  g = { kind: 'bridge', level: opt.level, tutor: opt.tutor, board: 0, total: [0, 0], history: [] };
  view = 'game';
  bNewDeal();
}
function bNewDeal() {
  g.board++;
  g.hands = dealHands();
  g.dealer = DEALER[(g.board - 1) % 4];
  g.vul = VUL[(g.board - 1) % 16];
  Object.assign(g, { auction: [], expl: [], phase: 'bid', turn: g.dealer, st: null, contract: null, hideRes: false, lastTrick: null, feedback: null, hint: null, hintCard: null, result: null });
  bStep();
}
const userControls = p => p === 0 || (p === 2 && g.contract && g.contract.declarer % 2 === 0);
function known(viewer) {
  const k = [viewer];
  if (g.st.played.length > 0 && !k.includes(g.dummy)) k.push(g.dummy);
  return k;
}
async function bStep() {
  const my = g;
  render();
  if (g.phase === 'bid') {
    if (auctionOver(g.auction)) return bEndAuction();
    if (g.turn === 0) return;
    await wait(650);
    if (g !== my) return;
    const r = chooseBid(g.auction, g.turn, g.hands[g.turn]);
    bCall(g.turn, r.call, r.expl);
  } else if (g.phase === 'play') {
    const st = g.st;
    if (isOver(st)) return bEndPlay();
    const p = st.turn;
    if (userControls(p)) return;
    await wait(st.trick.length === 0 ? 1000 : 600);
    if (g !== my) return;
    const viewer = p === g.dummy ? g.declarer : p;
    bPlay(p, chooseCard(st, p, g.level, known(viewer)));
  }
}
function bCall(seat, call, expl) {
  if (!expl) { const a = analyze(g.auction.concat([{ seat, call }])); expl = a.expl[a.expl.length - 1]; }
  g.auction.push({ seat, call });
  g.expl.push(expl);
  g.turn = (seat + 1) % 4;
  g.hint = null;
  bStep();
}
function userBid(call) {
  if (g.phase !== 'bid' || g.turn !== 0 || !isLegal(g.auction, 0, call)) return;
  if (g.tutor) {
    const rec = chooseBid(g.auction, 0, g.hands[0]);
    g.feedback = callEq(rec.call, call)
      ? { ok: true, html: `✓ Sistemle aynı: <b>${bidStr(call)}</b> — ${esc(rec.expl)}` }
      : { ok: false, html: `Sistem önerisi <b>${bidStr(rec.call)}</b> idi — ${esc(rec.expl)}` };
  }
  bCall(0, call, null);
}
function bEndAuction() {
  const c = finalContract(g.auction);
  if (!c) {
    g.phase = 'done';
    g.result = { title: 'Herkes pas geçti', text: 'El oynanmadı. Yeni ele geçin.' };
    return render();
  }
  g.contract = c;
  g.declarer = c.declarer;
  g.dummy = (c.declarer + 2) % 4;
  g.st = newTrickState(g.hands, (c.declarer + 1) % 4, c.st === 4 ? null : suitOf(c.st), bridgeRules(c));
  g.phase = 'play';
  if (g.tutor) g.feedback = { ok: true, html: `Kontrat: <b>${contractStr(c)}</b> — deklaran ${SEAT[c.declarer]}. ${6 + c.l} löve gerekiyor.${c.declarer % 2 === 0 ? ' Hem kendi elinizi hem Kuzey\'i siz oynayacaksınız.' : ' Savunmadasınız: kontratı batırmak için ' + (8 - c.l) + ' löve gerekli.'}` };
  bStep();
}
function bPlay(p, c) {
  const t = playCard(g.st, p, c);
  if (t) g.lastTrick = t;
  g.hint = null; g.hintCard = null;
  bStep();
}
function bUserCard(seat, i) {
  const st = g.st;
  if (g.phase !== 'play' || st.turn !== seat || !userControls(seat)) return;
  const c = st.hands[seat][i];
  const legal = st.rules.legal(st, seat);
  if (!legal.some(x => sameCard(x, c))) return;
  if (g.tutor && legal.length > 1) {
    const viewer = seat === g.dummy ? g.declarer : seat;
    const res = analyzeMoves(st, seat, known(viewer), 14);
    const best = res.reduce((a, b) => (b.v > a.v ? b : a));
    const mine = res.find(r => sameCard(r.c, c));
    g.feedback = best.v - mine.v >= 0.45
      ? { ok: false, html: `${cardStr(c)} yerine <b>${cardStr(best.c)}</b> daha iyiydi: ortalama ${best.v.toFixed(1)} löve, sizinki ${mine.v.toFixed(1)}. ${playTip(st)}` }
      : { ok: true, html: `✓ İyi kart: ${cardStr(c)} (ortalama ${mine.v.toFixed(1)} löve)` };
  }
  bPlay(seat, c);
}
function playTip(st) {
  const n = st.trick.length;
  if (n === 0) return 'İpucu: atakta güçlü dizinin tepesinden ya da eşinizin renginden oynayın; deklaransanız önce kozları çekin.';
  if (n === 1) return 'İpucu: ikinci el genelde küçük oynar; honörü honörle karşılayın.';
  if (n === 2) return 'İpucu: üçüncü el genelde büyük oynar.';
  return 'İpucu: son el, löveyi en ucuz kartla alır ya da en küçüğü atar.';
}
function bEndPlay() {
  const c = g.contract, side = c.declarer % 2;
  const tricks = g.st.won[side] + g.st.won[side + 2];
  const sc = scoreDeal(c, tricks, !!g.vul[side]);
  const ns = side === 0 ? sc : -sc;
  if (ns > 0) g.total[0] += ns; else g.total[1] += -ns;
  const need = 6 + c.l, diff = tricks - need;
  g.history.push({ board: g.board, contract: contractStr(c) + ' ' + SHORT[c.declarer], tricks, ns });
  g.phase = 'done';
  const ours = side === 0;
  g.result = {
    title: diff >= 0 ? `${contractStr(c)} ${diff ? '+' + diff : ''} yapıldı` : `${contractStr(c)} ${-diff} batık`,
    text: `${SEAT[c.declarer]} ${tricks} löve aldı (${need} gerekiyordu). Skor: <b class="${ns >= 0 ? 'pos' : 'neg'}">K-G ${ns >= 0 ? '+' : ''}${ns}</b>. ${(ours && diff >= 0) || (!ours && diff < 0) ? '🎉 Tebrikler!' : ''}`,
  };
  render();
}
function bHint() {
  if (g.phase === 'bid' && g.turn === 0) {
    const r = chooseBid(g.auction, 0, g.hands[0]);
    g.hint = `Öneri: <b>${bidStr(r.call)}</b> — ${esc(r.expl)}`;
  } else if (g.phase === 'play' && userControls(g.st.turn)) {
    const p = g.st.turn, viewer = p === g.dummy ? g.declarer : p;
    const res = analyzeMoves(g.st, p, known(viewer), 24).sort((a, b) => b.v - a.v);
    g.hintCard = res[0].c;
    g.hint = `Öneri: <b>${cardStr(res[0].c)}</b> (${SEAT[p]}) — ortalama ${res[0].v.toFixed(1)} löve.<br><small>${res.slice(0, 4).map(r => `${cardStr(r.c)}: ${r.v.toFixed(1)}`).join(' · ')}</small><br><small>${playTip(g.st)}</small>`;
  }
  render();
}

function seatHTML(p, opts) {
  const { visible, hand, legal, label, turn, hint } = opts;
  let body;
  if (!visible) body = backsHTML(hand.length, p === 1 || p === 3);
  else if (p === 0 || p === 2) body = handRow(hand, p, legal, hint);
  else body = suitLines(hand);
  return `<div class="seat ${POS[p]}">${p === 0 ? '' : `<div class="tag ${turn ? 'turn' : ''}">${label}</div>`}${body}${p === 0 ? `<div class="tag ${turn ? 'turn' : ''}">${label}</div>` : ''}</div>`;
}

function auctionHTML() {
  const order = [1, 2, 3, 0];
  const cells = [];
  for (let i = 0; i < order.indexOf(g.dealer); i++) cells.push('<td></td>');
  g.auction.forEach((a, i) => {
    const red = a.call.t === 'b' && (a.call.st === 1 || a.call.st === 2);
    cells.push(`<td class="${red ? 'red' : ''}" title="${esc(g.expl[i])}">${bidStr(a.call)}</td>`);
  });
  if (g.phase === 'bid') cells.push('<td class="q">?</td>');
  let rows = '';
  for (let i = 0; i < cells.length; i += 4) rows += `<tr>${cells.slice(i, i + 4).join('')}</tr>`;
  return `<table class="auc"><tr>${order.map(p => `<th>${SEAT[p].split(' ')[0]}${g.vul[p % 2] ? ' 🔴' : ''}</th>`).join('')}</tr>${rows}</table>`;
}
function bidBoxHTML(auction, seat, act = 'bid') {
  let h = '<div class="bidbox">';
  for (let l = 1; l <= 7; l++) for (let s = 0; s < 5; s++) {
    const c = { t: 'b', l, st: s };
    h += `<button data-act="${act}" data-call='${JSON.stringify(c)}' ${isLegal(auction, seat, c) ? '' : 'disabled'} class="${s === 1 || s === 2 ? 'red' : ''}">${l}${STRAIN_SYM[s]}</button>`;
  }
  h += `<div class="wide"><button class="pass" data-act="${act}" data-call='{"t":"p"}'>Pas</button>
    <button class="x" data-act="${act}" data-call='{"t":"x"}' ${isLegal(auction, seat, { t: 'x' }) ? '' : 'disabled'}>Kontr</button>
    <button data-act="${act}" data-call='{"t":"xx"}' ${isLegal(auction, seat, { t: 'xx' }) ? '' : 'disabled'}>Sürkontr</button></div></div>`;
  return h;
}
function handSummary(hand) {
  const L = lengths(hand);
  return `<b>${hcp(hand)}</b> HP · ${[0, 1, 2, 3].map(s => `<span class="${isRed(s) ? 'red' : ''}">${SUITS[s]}${L[s]}</span>`).join(' ')} · ${isBalanced(hand) ? 'dengeli' : 'dengesiz'}`;
}

function bridgeHTML() {
  const st = g.st, play = g.phase === 'play' || (g.phase === 'done' && st);
  const done = g.phase === 'done';
  const exposed = st && st.played.length > 0;
  const hands = done ? g.hands : st ? st.hands : g.hands;
  const turnP = g.phase === 'bid' ? g.turn : st && g.phase === 'play' ? st.turn : -1;
  const seats = [0, 1, 2, 3].map(p => {
    const visible = p === 0 || done || (exposed && (p === g.dummy || (p === 2 && g.declarer % 2 === 0)));
    const canPlay = g.phase === 'play' && st.turn === p && userControls(p);
    let tag = SEAT[p];
    if (g.dealer === p) tag += ' <small>· dağıtan</small>';
    if (g.contract && g.declarer === p) tag += ' <small>· deklaran</small>';
    if (g.contract && g.dummy === p) tag += ' <small>· yer</small>';
    return seatHTML(p, { visible, hand: hands[p], legal: canPlay ? st.rules.legal(st, p) : null, label: tag, turn: turnP === p, hint: g.hintCard });
  });
  let center = '';
  if (play && st) {
    const showing = st.trick.length ? st.trick : g.lastTrick ? g.lastTrick.cards : [];
    center = trickHTML(showing, !st.trick.length && g.lastTrick ? g.lastTrick.winner : -1);
  } else {
    center = `<div style="text-align:center;opacity:.9">${g.phase === 'bid' ? (g.turn === 0 ? 'Deklarasyon sırası sizde' : SEAT[g.turn] + ' düşünüyor…') : ''}</div>`;
  }
  const side0 = st ? st.won[0] + st.won[2] : 0, side1 = st ? st.won[1] + st.won[3] : 0;
  const msg = st && g.phase === 'play' ? (userControls(st.turn) ? `Sıra: ${SEAT[st.turn]} — kart seçin` : `${SEAT[st.turn]} oynuyor…`) : '';
  const panel = [];
  panel.push(`<div class="card-box"><div class="kv">
      <b>El</b><span>#${g.board} · ${LEVELS[g.level]}${g.tutor ? ' · öğretici' : ''}</span>
      <b>Zon</b><span>K-G ${g.vul[0] ? 'zonlu' : 'zonsuz'} · D-B ${g.vul[1] ? 'zonlu' : 'zonsuz'}</span>
      ${g.contract ? `<b>Kontrat</b><span><b>${contractStr(g.contract)}</b> · ${SEAT[g.declarer]}</span><b>Löve</b><span>K-G ${side0} · D-B ${side1}</span>` : ''}
      <b>Toplam</b><span>K-G ${g.total[0]} · D-B ${g.total[1]}</span></div></div>`);
  if (g.phase === 'bid' && g.turn === 0) panel.push(`<div class="card-box"><h3>Deklarasyonunuz</h3>${bidBoxHTML(g.auction, 0)}</div>`);
  panel.push(`<div class="card-box"><h3>Deklarasyon</h3>${auctionHTML()}</div>`);
  panel.push(`<div class="card-box"><h3>Eliniz</h3><div style="font-size:14px">${handSummary(g.hands[0])}</div>
    ${g.feedback ? `<div class="fb ${g.feedback.ok ? '' : 'warn'}" style="margin-top:8px">${g.feedback.html}</div>` : ''}
    ${g.hint ? `<div class="hint-box" style="margin-top:8px">${g.hint}</div>` : ''}
    <div class="row-btns" style="margin-top:8px">
      <button class="btn" data-act="hint" ${(g.phase === 'bid' && g.turn === 0) || (g.phase === 'play' && userControls(st.turn)) ? '' : 'disabled'}>💡 İpucu</button>
      <button class="btn ${g.phase === 'done' ? 'primary' : 'light'}" data-act="bnext">${g.phase === 'done' ? 'Sonraki el' : 'Yeni el'}</button>
      <button class="btn light" data-act="menu">Ana menü</button></div></div>`);
  if (g.tutor || g.auction.length) panel.push(`<div class="card-box"><h3>Deklarasyon açıklamaları</h3><div class="log">${g.auction.map((a, i) => `<div><b>${SEAT[a.seat].split(' ')[0]}: ${bidStr(a.call)}</b> — ${esc(g.expl[i])}</div>`).reverse().join('') || '<div>Henüz deklarasyon yok.</div>'}</div></div>`);
  let modal = '';
  if (g.phase === 'done' && g.result && !g.hideRes) {
    modal = `<div class="result"><div class="box"><h2>${g.result.title}</h2><p>${g.result.text}</p>
      <div class="allhands">${[2, 1, 3, 0].map(p => `<div><h4>${SEAT[p]} · ${hcp(g.hands[p])} HP</h4>${suitLines(g.hands[p]).replace('suitlines', 'sl')}</div>`).join('')}</div>
      ${g.history.length ? `<table class="sc"><tr><th>El</th><th>Kontrat</th><th>Löve</th><th>K-G</th></tr>${g.history.slice(-6).map(h => `<tr><td>#${h.board}</td><td>${h.contract}</td><td>${h.tricks}</td><td class="${h.ns >= 0 ? 'pos' : 'neg'}">${h.ns}</td></tr>`).join('')}</table>` : ''}
      <div class="row-btns" style="margin-top:12px"><button class="btn primary" data-act="bnext">Sonraki el</button><button class="btn light" data-act="closeres">Masayı gör</button><button class="btn light" data-act="menu">Ana menü</button></div></div></div>`;
  }
  return `<section class="game"><div class="table">${seats.join('')}
    <div class="center">${g.contract ? `<div class="contractbadge">${contractStr(g.contract)} · ${SHORT[g.declarer]}</div>` : ''}${center}<div class="centermsg">${msg}</div></div></div>
    <aside class="panel">${panel.join('')}</aside></section>${modal}`;
}

// ---------------- KING ----------------
const gameName = o => (o.type === 'koz' ? `Koz ${SUITS[o.trump]} (${SUIT_NAMES[o.trump]})` : KING_GAMES[o.type].name);
function startKing(opt) {
  g = {
    kind: 'king', level: opt.level, team: opt.team, deal: 0,
    picks: [0, 1, 2, 3].map(() => ({ koz: 0, ceza: 0 })),
    used: { el: 0, kupa: 0, erkek: 0, kiz: 0, rifki: 0, soniki: 0 },
    scores: [0, 0, 0, 0], hist: [],
  };
  view = 'game';
  kNewDeal();
}
function kNewDeal() {
  g.deal++;
  if (g.deal > 20) { g.phase = 'over'; return render(); }
  g.chooser = (g.deal - 1) % 4;
  g.hands = dealHands();
  Object.assign(g, { hideRes: false, phase: 'choose', st: null, game: null, lastTrick: null, hint: null, hintCard: null, hintAdv: null, early: false });
  g.options = kingOptions(g.picks, g.used, g.chooser);
  render();
  if (g.chooser !== 0) kAIChoose();
}
async function kAIChoose() {
  const my = g;
  await wait(900);
  if (g !== my) return;
  kStart(kingChooseGame(g.hands[g.chooser], g.chooser, g.options, g.team, g.level).choice);
}
function kStart(o) {
  const p = g.chooser;
  g.game = o;
  if (o.type === 'koz') g.picks[p].koz++; else { g.picks[p].ceza++; g.used[o.type]++; }
  const tr = o.type === 'koz' ? o.trump : null;
  g.st = newTrickState(g.hands, p, tr, kingRules(o.type, tr, g.team));
  g.phase = 'play';
  g.hint = null;
  kStep();
}
async function kStep() {
  const my = g, st = g.st;
  render();
  if (isOver(st)) return kEnd();
  const p = st.turn;
  if (p === 0) return;
  await wait(st.trick.length === 0 ? 1000 : 600);
  if (g !== my) return;
  kPlay(p, chooseCard(st, p, g.level, [p]));
}
function kPlay(p, c) {
  const t = playCard(g.st, p, c);
  if (t) g.lastTrick = t;
  g.hint = null; g.hintCard = null;
  kStep();
}
function kUserCard(i) {
  const st = g.st;
  if (g.phase !== 'play' || st.turn !== 0) return;
  const c = st.hands[0][i];
  if (!st.rules.legal(st, 0).some(x => sameCard(x, c))) return;
  kPlay(0, c);
}
function kEnd() {
  const sc = kingScores(g.st, g.game.type);
  sc.forEach((v, i) => (g.scores[i] += v));
  g.early = g.st.tricks.length < 13;
  g.hist.push({ deal: g.deal, chooser: g.chooser, game: g.game, sc });
  g.phase = 'done';
  render();
}
function kHint() {
  if (g.phase === 'choose' && g.chooser === 0) {
    const r = kingChooseGame(g.hands[0], 0, g.options, g.team, 'hard');
    g.hintAdv = r.adv;
    g.hint = `Öneri: <b>${gameName(r.choice)}</b> — bu el için ortalamaya göre en avantajlı seçim (simülasyonla).`;
  } else if (g.phase === 'play' && g.st.turn === 0) {
    const res = analyzeMoves(g.st, 0, [0], 24).sort((a, b) => b.v - a.v);
    g.hintCard = res[0].c;
    g.hint = `Öneri: <b>${cardStr(res[0].c)}</b> — beklenen puan ${Math.round(res[0].v)}.<br><small>${res.slice(0, 4).map(r => `${cardStr(r.c)}: ${Math.round(r.v)}`).join(' · ')}</small>`;
  }
  render();
}
const kName = p => (p === 0 ? 'Siz' : SEAT[p]);
function kScoreTable() {
  const fmt = v => `<span class="${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}">${v}</span>`;
  if (g.team) return `<table class="sc"><tr><th>Takım</th><th>Puan</th></tr><tr><td>Biz (Güney + Kuzey)</td><td>${fmt(g.scores[0] + g.scores[2])}</td></tr><tr><td>Onlar (Batı + Doğu)</td><td>${fmt(g.scores[1] + g.scores[3])}</td></tr></table>`;
  return `<table class="sc"><tr><th>Oyuncu</th><th>Puan</th></tr>${[0, 1, 2, 3].map(p => `<tr><td>${kName(p)}</td><td>${fmt(g.scores[p])}</td></tr>`).join('')}</table>`;
}
function kingHTML() {
  const st = g.st;
  const live = st ? kingScores(st, g.game.type) : [0, 0, 0, 0];
  const turnP = g.phase === 'choose' ? g.chooser : st && g.phase === 'play' ? st.turn : -1;
  const hands = g.phase === 'choose' ? g.hands : st.hands;
  const seats = [0, 1, 2, 3].map(p => {
    const legal = g.phase === 'play' && st.turn === 0 && p === 0 ? st.rules.legal(st, 0) : null;
    let tag = kName(p) + (g.team ? (p % 2 === 0 ? ' <small>· biz</small>' : ' <small>· onlar</small>') : '');
    if (g.chooser === p) tag += ' <small>· seçen</small>';
    if (st) tag += ` <small>· ${st.won[p]} el${live[p] ? ' · ' + live[p] : ''}</small>`;
    return seatHTML(p, { visible: p === 0, hand: hands[p], legal, label: tag, turn: turnP === p, hint: g.hintCard });
  });
  let center = '';
  if (st) {
    const showing = st.trick.length ? st.trick : g.lastTrick ? g.lastTrick.cards : [];
    center = trickHTML(showing, !st.trick.length && g.lastTrick ? g.lastTrick.winner : -1);
  } else center = `<div style="text-align:center">${g.chooser === 0 ? 'Oyun seçme sırası sizde' : SEAT[g.chooser] + ' oyun seçiyor…'}</div>`;
  const panel = [];
  panel.push(`<div class="card-box"><div class="kv"><b>Oyun</b><span>${Math.min(g.deal, 20)} / 20 · ${g.team ? 'Eşli' : 'Tekli'} · ${LEVELS[g.level]}</span>
    ${g.game ? `<b>Şu an</b><span><b>${gameName(g.game)}</b> — ${KING_GAMES[g.game.type].rule}</span>` : ''}</div></div>`);
  if (g.phase === 'choose' && g.chooser === 0) {
    const pk = g.picks[0];
    panel.push(`<div class="card-box"><h3>Oyununuzu seçin</h3><p class="hintline" style="margin-top:0">Ceza hakkı ${3 - pk.ceza}/3 · Koz hakkı ${2 - pk.koz}/2</p>
      <div class="choose">${g.options.map((o, i) => {
        const best = g.hintAdv && g.hintAdv[i] === Math.max(...g.hintAdv);
        return `<button data-act="kchoose" data-i="${i}" class="${best ? 'best' : ''} ${o.type === 'koz' && isRed(o.trump) ? 'red' : ''}">${gameName(o)}<small>${o.type === 'koz' ? 'Her el +50' : KING_GAMES[o.type].rule.split('.')[0] + ' · kalan ' + (2 - g.used[o.type])}</small></button>`;
      }).join('')}</div></div>`);
  }
  panel.push(`<div class="card-box"><h3>Puan durumu</h3>${kScoreTable()}
    ${g.hint ? `<div class="hint-box" style="margin-top:8px">${g.hint}</div>` : ''}
    <div class="row-btns" style="margin-top:8px"><button class="btn" data-act="hint" ${(g.phase === 'choose' && g.chooser === 0) || (g.phase === 'play' && st.turn === 0) ? '' : 'disabled'}>💡 İpucu</button>
    ${g.phase === 'done' ? '<button class="btn primary" data-act="knext">Sonraki oyun</button>' : ''}<button class="btn light" data-act="menu">Ana menü</button></div></div>`);
  panel.push(`<div class="card-box"><h3>Oynanan oyunlar</h3><div class="log">${g.hist.map(h => `<div><b>${h.deal}. ${gameName(h.game)}</b> (${kName(h.chooser)}) — ${h.sc.map((v, p) => `${SHORT[p]} ${v}`).join(', ')}</div>`).reverse().join('') || '<div>Henüz oyun yok.</div>'}</div></div>`);
  let modal = '';
  if (g.phase === 'done' && !g.hideRes) {
    const h = g.hist[g.hist.length - 1];
    modal = `<div class="result"><div class="box"><h2>${gameName(h.game)} bitti</h2>${g.early ? '<p>Tüm ceza kartları çıktığı için oyun erken bitti.</p>' : ''}
      <table class="sc"><tr><th>Oyuncu</th><th>Bu oyun</th><th>Toplam</th></tr>${[0, 1, 2, 3].map(p => `<tr><td>${kName(p)}</td><td class="${h.sc[p] < 0 ? 'neg' : h.sc[p] > 0 ? 'pos' : ''}">${h.sc[p]}</td><td>${g.scores[p]}</td></tr>`).join('')}</table>
      ${g.team ? `<p>Biz: <b>${g.scores[0] + g.scores[2]}</b> · Onlar: <b>${g.scores[1] + g.scores[3]}</b></p>` : ''}
      <div class="row-btns" style="margin-top:12px"><button class="btn primary" data-act="knext">${g.deal >= 20 ? 'Sonuçları gör' : 'Sonraki oyun'}</button><button class="btn light" data-act="closeres">Masayı gör</button></div></div></div>`;
  }
  if (g.phase === 'over') {
    let txt;
    if (g.team) { const us = g.scores[0] + g.scores[2], th = g.scores[1] + g.scores[3]; txt = us > th ? '🏆 Takımınız kazandı!' : us === th ? 'Berabere!' : 'Rakip takım kazandı.'; }
    else { const order = [0, 1, 2, 3].sort((a, b) => g.scores[b] - g.scores[a]); txt = order[0] === 0 ? '🏆 Birinci oldunuz!' : `Sıralamanız: ${order.indexOf(0) + 1}.`; }
    modal = `<div class="result"><div class="box"><h2>King bitti</h2><p>${txt}</p>${kScoreTable()}
      <div class="row-btns" style="margin-top:12px"><button class="btn primary" data-act="startking">Yeniden oyna</button><button class="btn light" data-act="menu">Ana menü</button></div></div></div>`;
  }
  return `<section class="game"><div class="table">${seats.join('')}
    <div class="center">${g.game ? `<div class="contractbadge">${gameName(g.game)}</div>` : ''}${center}<div class="centermsg">${st && g.phase === 'play' ? (st.turn === 0 ? 'Sıra sizde — kart seçin' : SEAT[st.turn] + ' oynuyor…') : ''}</div></div></div>
    <aside class="panel">${panel.join('')}</aside></section>${modal}`;
}

// ---------------- ÖĞREN ----------------
function newQuiz(type) {
  if (type === 'hcp') { const h = dealHands()[0]; quiz = { type, hand: h, answer: hcp(h) }; }
  else if (type === 'open') {
    let h;
    do { h = dealHands()[0]; } while (Math.random() < 0.6 && hcp(h) < 11);
    quiz = { type, hand: h, auction: [], seat: 0 };
  } else {
    let hs, op;
    do { hs = dealHands(); op = chooseBid([], 2, hs[2]).call; } while (!(op.t === 'b' && op.l === 1));
    quiz = { type, hand: hs[0], auction: [{ seat: 2, call: op }, { seat: 3, call: { t: 'p' } }], seat: 0 };
  }
  quiz.done = null;
}
function learnHTML() {
  const items = LESSONS.map((l, i) => `<button data-act="lesson" data-i="${i}" class="${learnSel === i ? 'on' : ''}">${l.title}</button>`).join('');
  let content;
  if (typeof learnSel === 'number') content = `<h2>${LESSONS[learnSel].title}</h2>${LESSONS[learnSel].html}
    <div class="row-btns" style="margin-top:16px">${learnSel > 0 ? `<button class="btn light" data-act="lesson" data-i="${learnSel - 1}">← Önceki</button>` : ''}
    ${learnSel < LESSONS.length - 1 ? `<button class="btn" data-act="lesson" data-i="${learnSel + 1}">Sonraki ders →</button>` : `<button class="btn" data-act="tutorplay">Oynayarak dene →</button>`}</div>`;
  else if (learnSel === 'king') content = `<h2>King kuralları</h2>${KING_RULES}`;
  else content = quizHTML();
  return `<section class="learn"><div class="side"><h4>Briç dersleri</h4>${items}
      <h4>Alıştırmalar</h4>
      <button data-act="quiz" data-q="hcp" class="${learnSel === 'q-hcp' ? 'on' : ''}">Puan sayma</button>
      <button data-act="quiz" data-q="open" class="${learnSel === 'q-open' ? 'on' : ''}">Açış deklarasyonu</button>
      <button data-act="quiz" data-q="resp" class="${learnSel === 'q-resp' ? 'on' : ''}">Eşe cevap</button>
      <h4>King</h4><button data-act="lesson" data-i="king" class="${learnSel === 'king' ? 'on' : ''}">King kuralları</button>
    </div><div class="box content">${content}</div></section>`;
}
function quizHTML() {
  const q = quiz;
  const handH = `<div class="quiz">${handRow(q.hand, 0, null, null)}</div>`;
  let body = '';
  if (q.type === 'hcp') {
    body = `<h2>Puan sayma</h2><p>Bu elde kaç honör puanı (HP) var? <small>(A=4, K=3, Q=2, J=1)</small></p>${handH}
      <p><input type="number" id="hcpin" min="0" max="37"> <button class="btn" data-act="qcheck">Kontrol et</button></p>`;
    if (q.done) body += `<div class="fb ${q.done.ok ? '' : 'warn'}">${q.done.html}</div>`;
  } else {
    const title = q.type === 'open' ? 'Açış deklarasyonu' : 'Eşe cevap';
    const desc = q.type === 'open' ? 'İlk konuşan sizsiniz. Ne açarsınız?' : `Eşiniz Kuzey <b>${bidStr(q.auction[0].call)}</b> açtı, Doğu pas dedi. Cevabınız?`;
    body = `<h2>${title}</h2><p>${desc}</p>${handH}<p style="font-size:14px">${handSummary(q.hand)}</p>
      ${q.done ? `<div class="fb ${q.done.ok ? '' : 'warn'}">${q.done.html}</div>` : `<div class="quiz">${bidBoxHTML(q.auction, 0, 'qbid')}</div>`}`;
  }
  return `<div class="quiz">${body}<div class="row-btns" style="margin-top:12px"><button class="btn" data-act="quiz" data-q="${q.type}">Yeni soru</button></div></div>`;
}

// ---------------- olaylar ----------------
app.addEventListener('click', onAct);
document.querySelector('.top').addEventListener('click', onAct);
app.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.act === 'card') { e.preventDefault(); onAct(e); } });
app.addEventListener('change', e => {
  if (e.target.dataset.act === 'tutor') setup.tutor = e.target.checked;
  if (e.target.dataset.act === 'tableimg') loadTableImage(e.target.files[0]);
});

function onAct(e) {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const a = el.dataset.act;
  switch (a) {
    case 'menu': g = null; view = 'menu'; break;
    case 'bsetup': view = 'bsetup'; break;
    case 'ksetup': view = 'ksetup'; break;
    case 'learn': g = null; view = 'learn'; break;
    case 'cards': view = 'cards'; break;
    case 'look': look[el.dataset.k] = el.dataset.v === 'true' ? true : el.dataset.v === 'false' ? false : el.dataset.v; applyLook(); break;
    case 'clearimg': customImg = null; try { localStorage.removeItem('tableImg'); } catch (e) {} if (look.felt === 'custom') look.felt = 'green'; applyLook(); break;
    case 'lookdone': view = g ? 'game' : 'menu'; break;
    case 'set': setup[el.dataset.k] = el.dataset.v === 'true' ? true : el.dataset.v === 'false' ? false : el.dataset.v; break;
    case 'tutor': return;
    case 'startbridge': return startBridge(setup);
    case 'startking': return startKing(setup);
    case 'tutorplay': return startBridge({ level: 'medium', tutor: true });
    case 'bid': return userBid(JSON.parse(el.dataset.call));
    case 'card': return g.kind === 'bridge' ? bUserCard(+el.dataset.seat, +el.dataset.i) : kUserCard(+el.dataset.i);
    case 'hint': return g.kind === 'bridge' ? bHint() : kHint();
    case 'bnext': return bNewDeal();
    case 'knext': return kNewDeal();
    case 'closeres': g.hideRes = true; break;
    case 'kchoose': return kStart(g.options[+el.dataset.i]);
    case 'lesson': learnSel = el.dataset.i === 'king' ? 'king' : +el.dataset.i; break;
    case 'quiz': learnSel = 'q-' + el.dataset.q; newQuiz(el.dataset.q); break;
    case 'qcheck': {
      const v = +document.getElementById('hcpin').value;
      const det = quiz.hand.filter(c => c.r > 10).map(c => `${cardStr(c)}=${c.r - 10}`).join(' + ') || 'honör yok';
      quiz.done = { ok: v === quiz.answer, html: v === quiz.answer ? `✓ Doğru! ${quiz.answer} HP (${det})` : `✗ Doğru cevap ${quiz.answer} HP: ${det}` };
      break;
    }
    case 'qbid': {
      const call = JSON.parse(el.dataset.call);
      const rec = chooseBid(quiz.auction, 0, quiz.hand);
      quiz.done = callEq(rec.call, call)
        ? { ok: true, html: `✓ Doğru: <b>${bidStr(call)}</b> — ${esc(rec.expl)}` }
        : { ok: false, html: `Seçiminiz <b>${bidStr(call)}</b>. Sistem önerisi <b>${bidStr(rec.call)}</b>: ${esc(rec.expl)}` };
      break;
    }
    default: return;
  }
  render();
  if (a === 'menu' || a === 'learn' || a === 'lesson' || a === 'quiz') window.scrollTo(0, 0);
}

function cardsHTML() {
  const sample = [{ s: 0, r: 14 }, { s: 1, r: 13 }, { s: 3, r: 12 }, { s: 2, r: 11 }, { s: 1, r: 10 }, { s: 3, r: 7 }, { s: 2, r: 3 }];
  const opt = (k, list) => `<div class="seg">${list.map(([v, t]) => `<button data-act="look" data-k="${k}" data-v="${v}" class="${String(look[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const backs = `<div class="backpick">${BACKS.map(([v, t]) => `<button data-act="look" data-k="back" data-v="${v}" class="${look.back === v ? 'on' : ''}"><span class="card back bk-${v}"></span><small>${t}</small></button>`).join('')}</div>`;
  return `<section class="setup wide"><div class="box"><h2>Kart görünümü</h2>
    <div class="preview table-bg">${sample.map(c => cardHTML(c)).join('')}<div class="card back"></div></div>
    <div class="opt"><label class="t">Ön yüz teması</label>${opt('theme', THEMES)}</div>
    <div class="opt"><label class="t">Arka yüz</label>${backs}</div>
    <div class="opt"><label class="t">Masa zemini</label><div class="backpick">${FELTS.map(([v, t]) => `<button data-act="look" data-k="felt" data-v="${v}" class="${look.felt === v ? 'on' : ''}"><span class="feltsw tb-${v}"></span><small>${t}</small></button>`).join('')}
      ${customImg ? `<button data-act="look" data-k="felt" data-v="custom" class="${look.felt === 'custom' ? 'on' : ''}"><span class="feltsw tb-custom"></span><small>Kendi resmim</small></button>` : ''}
      <label class="upload"><input type="file" accept="image/*" data-act="tableimg" hidden><span class="feltsw plus">＋</span><small>Bilgisayardan seç</small></label></div>
      ${customImg ? '<button class="btn light" style="margin-top:6px" data-act="clearimg">Kendi resmimi kaldır</button>' : ''}</div>
    <div class="opt"><label class="t">Renkler</label>${opt('four', [['false', 'İki renk (klasik)'], ['true', 'Dört renk (♣ yeşil, ♦ mavi)']])}</div>
    <div class="opt"><label class="t">Köşe yazısı</label>${opt('big', [['false', 'Normal'], ['true', 'Büyük (kolay okunur)']])}</div>
    <button class="btn primary" data-act="lookdone">${g ? 'Oyuna dön' : 'Tamam'}</button></div></section>`;
}

render();
