// Genel löve (el) alma motoru + Monte Carlo arama. Briç ve King ortak kullanır.
import { sameCard, shuffle } from './cards.js';

export function newTrickState(hands, leader, trump, rules) {
  return {
    hands: hands.map(h => h.slice()), trick: [], leader, turn: leader, trump, rules,
    won: [0, 0, 0, 0], tricks: [], played: [],
    voids: [0, 1, 2, 3].map(() => [0, 0, 0, 0]),
    heartsBroken: false, trumpBroken: false,
  };
}

export function cloneState(st) {
  return {
    ...st, hands: st.hands.map(h => h.slice()), trick: st.trick.slice(), won: st.won.slice(),
    tricks: st.tricks.slice(), played: st.played.slice(), voids: st.voids.map(v => v.slice()),
  };
}

export function trickWinner(trick, trump) {
  let best = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const t = trick[i], b = best.c, c = t.c;
    if (c.s === b.s) { if (c.r > b.r) best = t; }
    else if (trump != null && c.s === trump) best = t;
  }
  return best.p;
}

export function playCard(st, p, c) {
  const h = st.hands[p];
  h.splice(h.findIndex(x => sameCard(x, c)), 1);
  if (st.trick.length && c.s !== st.trick[0].c.s) st.voids[p][st.trick[0].c.s] = 1;
  if (c.s === 1) st.heartsBroken = true;
  if (st.trump != null && c.s === st.trump) st.trumpBroken = true;
  st.trick.push({ p, c });
  st.played.push(c);
  if (st.trick.length < 4) { st.turn = (p + 1) % 4; return null; }
  const w = trickWinner(st.trick, st.trump);
  const t = { cards: st.trick, winner: w, idx: st.tricks.length };
  st.tricks.push(t);
  st.won[w]++;
  st.trick = [];
  st.leader = st.turn = w;
  return t;
}

export const isOver = st => st.tricks.length === 13 || (st.trick.length === 0 && !!st.rules.done && st.rules.done(st));

// ---- ortak sezgisel yardımcılar
export const lowest = cs => cs.reduce((a, b) => (b.r < a.r ? b : a));
export const highest = cs => cs.reduce((a, b) => (b.r > a.r ? b : a));
export function isMaster(st, p, c) {
  for (let r = c.r + 1; r <= 14; r++) {
    if (!st.hands[p].some(x => x.s === c.s && x.r === r) && !st.played.some(x => x.s === c.s && x.r === r)) return false;
  }
  return true;
}
export function beats(c, w, trump) {
  if (c.s === w.s) return c.r > w.r;
  return trump != null && c.s === trump;
}

function discard(st, p, legal, trump) {
  const non = legal.filter(c => c.s !== trump);
  const pool = non.length ? non : legal;
  const nm = pool.filter(c => !isMaster(st, p, c));
  return lowest(nm.length ? nm : pool);
}

// Löve kazanmaya çalışan oyunlar için (briç, King koz). partner<0 ise eş yok.
export function winHeur(st, p, trump, partner, lead) {
  const legal = st.rules.legal(st, p);
  if (legal.length === 1) return legal[0];
  if (!st.trick.length) return lead(st, p, legal);
  const L = st.trick[0].c.s;
  const wp = trickWinner(st.trick, trump);
  const wc = st.trick.find(t => t.p === wp).c;
  const partnerWin = wp === partner;
  const last = st.trick.length === 3;
  const winners = legal.filter(c => beats(c, wc, trump));
  if (legal[0].s === L) {
    if (partnerWin && (last || isMaster(st, p, wc))) return lowest(legal);
    if (!winners.length) return lowest(legal);
    if (last) return lowest(winners);
    if (st.trick.length === 1 && wc.r < 11) return lowest(legal); // 2. el küçük
    const m = winners.filter(c => isMaster(st, p, c));
    if (m.length) return lowest(m);
    return st.trick.length === 2 ? highest(winners) : lowest(winners); // 3. el büyük
  }
  if (partnerWin && (last || isMaster(st, p, wc))) return discard(st, p, legal, trump);
  const tw = winners.filter(c => trump != null && c.s === trump);
  if (tw.length) return lowest(tw);
  return discard(st, p, legal, trump);
}

// ---- Monte Carlo
export function rollout(st) {
  while (!isOver(st)) { const p = st.turn; playCard(st, p, st.rules.heuristic(st, p)); }
}

function sampleWorld(st, known) {
  const seats = [0, 1, 2, 3].filter(s => !known.includes(s));
  const pool = [].concat(...seats.map(s => st.hands[s]));
  for (let a = 0; a < 40; a++) {
    const cards = shuffle(pool.slice());
    const cap = seats.map(s => st.hands[s].length);
    const out = seats.map(() => []);
    let ok = true;
    for (const c of cards) {
      const el = [];
      seats.forEach((s, i) => { if (out[i].length < cap[i] && (a >= 39 || !st.voids[s][c.s])) el.push(i); });
      if (!el.length) { ok = false; break; }
      out[el[Math.floor(Math.random() * el.length)]].push(c);
    }
    if (ok) { const w = cloneState(st); seats.forEach((s, i) => (w.hands[s] = out[i])); return w; }
  }
  return cloneState(st);
}

export function analyzeMoves(st, p, known, samples = 20) {
  const legal = st.rules.legal(st, p);
  const tot = legal.map(() => 0);
  for (let k = 0; k < samples; k++) {
    const w = sampleWorld(st, known);
    legal.forEach((c, i) => {
      const x = cloneState(w);
      playCard(x, p, c);
      rollout(x);
      tot[i] += st.rules.evaluate(x, p);
    });
  }
  return legal.map((c, i) => ({ c, v: tot[i] / samples }));
}

export function chooseCard(st, p, level, known) {
  const legal = st.rules.legal(st, p);
  if (legal.length === 1) return legal[0];
  const h = st.rules.heuristic(st, p);
  if (level === 'easy') return Math.random() < 0.45 ? legal[Math.floor(Math.random() * legal.length)] : h;
  if (level === 'medium') return h;
  const res = analyzeMoves(st, p, known, st.rules.samples || 20);
  const best = res.reduce((a, b) => (b.v > a.v ? b : a));
  const hv = res.find(r => sameCard(r.c, h));
  return hv && hv.v >= best.v - 0.01 ? h : best.c;
}
