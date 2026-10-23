// King: 20 oyun, 6 ceza tipi (her biri 2 kez) + koz. Her oyuncu 3 ceza + 2 koz seçer.
import { trickWinner, isMaster, lowest, highest, winHeur, newTrickState, rollout } from './engine.js';
import { makeDeck, shuffle, sameCard } from './cards.js';

export const KING_GAMES = {
  el: { name: 'El Almaz', rule: 'Alınan her el (löve) -50 puan.', base: -650 },
  kupa: { name: 'Kupa Almaz', rule: 'Alınan her kupa -30 puan. Kupa, kırılmadan açılamaz; renk yoksa kupa atmak zorunlu.', base: -390 },
  erkek: { name: 'Erkek Almaz', rule: 'Alınan her Papaz (K) ve Vale (J) -60 puan. Renk yoksa erkek atmak zorunlu.', base: -480 },
  kiz: { name: 'Kız Almaz', rule: 'Alınan her Kız (Q) -100 puan. Renk yoksa kız atmak zorunlu.', base: -400 },
  rifki: { name: 'Rıfkı', rule: 'Kupa Papazını (♥K) alan -320 puan. Fırsat çıkınca ♥K atılmak zorunda.', base: -320 },
  soniki: { name: 'Son İki', rule: 'Son iki elin her biri -180 puan.', base: -360 },
  koz: { name: 'Koz', rule: 'Alınan her el +50 puan. Koz kırılmadan koz açılamaz; renk yoksa koz çakmak zorunlu.', base: 650 },
};
export const CEZA = ['el', 'kupa', 'erkek', 'kiz', 'rifki', 'soniki'];

export function trickPoints(type, t) {
  const cs = t.cards;
  switch (type) {
    case 'el': return -50;
    case 'kupa': return -30 * cs.filter(x => x.c.s === 1).length;
    case 'erkek': return -60 * cs.filter(x => x.c.r === 13 || x.c.r === 11).length;
    case 'kiz': return -100 * cs.filter(x => x.c.r === 12).length;
    case 'rifki': return cs.some(x => x.c.s === 1 && x.c.r === 13) ? -320 : 0;
    case 'soniki': return t.idx >= 11 ? -180 : 0;
    case 'koz': return 50;
  }
  return 0;
}
export function kingScores(st, type) {
  const sc = [0, 0, 0, 0];
  st.tricks.forEach(t => (sc[t.winner] += trickPoints(type, t)));
  return sc;
}

function kingLegal(type, trump) {
  return (st, p) => {
    const h = st.hands[p];
    if (!st.trick.length) {
      let c = h;
      if (type === 'koz' && !st.trumpBroken) { const n = h.filter(x => x.s !== trump); if (n.length) c = n; }
      if ((type === 'kupa' || type === 'rifki') && !st.heartsBroken) { const n = h.filter(x => x.s !== 1); if (n.length) c = n; }
      return c.slice();
    }
    const L = st.trick[0].c.s;
    const f = h.filter(x => x.s === L);
    if (f.length) {
      if (type === 'koz' && L !== trump && st.trick.some(t => t.c.s === trump)) return f;
      const mx = Math.max(...st.trick.filter(t => t.c.s === L).map(t => t.c.r));
      const hi = f.filter(x => x.r > mx);
      const res = hi.length ? hi : f;
      if (type === 'rifki' && L === 1 && mx === 14) { const k = res.find(x => x.r === 13); if (k) return [k]; }
      return res;
    }
    if (type === 'koz') {
      const t = h.filter(x => x.s === trump);
      if (t.length) {
        const tt = st.trick.filter(x => x.c.s === trump).map(x => x.c.r);
        const mx = tt.length ? Math.max(...tt) : 0;
        const hi = t.filter(x => x.r > mx);
        return hi.length ? hi : t;
      }
      return h.slice();
    }
    if (type === 'rifki') { const k = h.find(x => x.s === 1 && x.r === 13); if (k) return [k]; }
    if (type === 'kupa') { const hs = h.filter(x => x.s === 1); if (hs.length) return hs; }
    if (type === 'kiz') { const q = h.filter(x => x.r === 12); if (q.length) return q; }
    if (type === 'erkek') { const q = h.filter(x => x.r === 13 || x.r === 11); if (q.length) return q; }
    return h.slice();
  };
}

function kingDone(type) {
  return st => {
    const pl = st.played;
    if (type === 'kupa') return pl.filter(c => c.s === 1).length === 13;
    if (type === 'kiz') return pl.filter(c => c.r === 12).length === 4;
    if (type === 'erkek') return pl.filter(c => c.r === 13 || c.r === 11).length === 8;
    if (type === 'rifki') return pl.some(c => c.s === 1 && c.r === 13);
    return false;
  };
}

function danger(type, c) {
  switch (type) {
    case 'kupa': return c.s === 1 ? 30 : 0;
    case 'erkek': return c.r === 13 || c.r === 11 ? 60 : 0;
    case 'kiz': return c.r === 12 ? 100 : 0;
    case 'rifki': return c.s === 1 && c.r === 13 ? 320 : 0;
  }
  return 0;
}

function avoidHeur(type, team) {
  return (st, p) => {
    const legal = st.rules.legal(st, p);
    if (legal.length === 1) return legal[0];
    const part = team ? (p + 2) % 4 : -1;
    if (type === 'soniki' && st.tricks.length < 9) {
      // erken ellerde büyük kartlardan kurtul
      return highest(legal);
    }
    const unseenHigher = c => {
      let n = 0;
      for (let r = c.r + 1; r <= 14; r++) if (!st.hands[p].some(x => x.s === c.s && x.r === r) && !st.played.some(x => x.s === c.s && x.r === r)) n++;
      return n;
    };
    if (!st.trick.length) {
      let best = null, bs = -1e9;
      for (const c of legal) {
        const u = unseenHigher(c);
        let s = u * 10 - c.r - danger(type, c) / 5;
        if (u === 0) s -= 60;
        if (s > bs) { bs = s; best = c; }
      }
      return best;
    }
    const L = st.trick[0].c.s;
    const wp = trickWinner(st.trick, null);
    const wc = st.trick.find(t => t.p === wp).c;
    const friend = wp === part;
    const dump = (a, b) => (friend ? danger(type, a) - danger(type, b) : danger(type, b) - danger(type, a)) || b.r - a.r;
    if (legal[0].s === L) {
      const losers = legal.filter(c => c.r < wc.r);
      if (losers.length) return losers.sort(dump)[0];
      return legal.slice().sort((a, b) => danger(type, a) - danger(type, b) || (st.trick.length === 3 ? b.r - a.r : a.r - b.r))[0];
    }
    return legal.slice().sort(dump)[0];
  };
}

const kozLead = trump => (st, p, legal) => {
  const t = legal.filter(c => c.s === trump);
  const out = 13 - st.played.filter(c => c.s === trump).length - st.hands[p].filter(c => c.s === trump).length;
  if (t.length && out > 0) {
    const m = t.filter(c => isMaster(st, p, c));
    if (m.length) return highest(m);
    if (t.length >= 5) return lowest(t);
  }
  const m = legal.filter(c => c.s !== trump && isMaster(st, p, c));
  if (m.length) return highest(m);
  const non = legal.filter(c => c.s !== trump);
  return lowest(non.length ? non : legal);
};

export function kingRules(type, trump, team) {
  const heuristic = type === 'koz'
    ? (st, p) => winHeur(st, p, trump, team ? (p + 2) % 4 : -1, kozLead(trump))
    : avoidHeur(type, team);
  return {
    type, trump, team, samples: 20, legal: kingLegal(type, trump), heuristic, done: kingDone(type),
    evaluate(st, p) { const sc = kingScores(st, type); return team ? sc[p] + sc[(p + 2) % 4] : sc[p]; },
  };
}

export function kingOptions(picks, used, p) {
  const o = [];
  if (picks[p].ceza < 3) for (const t of CEZA) if (used[t] < 2) o.push({ type: t });
  if (picks[p].koz < 2) for (const s of [0, 1, 2, 3]) o.push({ type: 'koz', trump: s });
  return o;
}

// Her seçeneği rastgele dağıtımlarla simüle edip ortalamaya göre avantajı ölç
export function kingChooseGame(hand, p, options, team, level) {
  if (level === 'easy') return { choice: options[Math.floor(Math.random() * options.length)], adv: null };
  const N = level === 'hard' ? 14 : 6;
  const rest = makeDeck().filter(c => !hand.some(h => sameCard(h, c)));
  const vals = options.map(() => 0);
  for (let k = 0; k < N; k++) {
    const r = shuffle(rest.slice());
    const hands = [];
    let i = 0;
    for (let s = 0; s < 4; s++) hands[s] = s === p ? hand.slice() : r.slice(i, (i += 13));
    options.forEach((o, j) => {
      const tr = o.type === 'koz' ? o.trump : null;
      const st = newTrickState(hands, p, tr, kingRules(o.type, tr, team));
      rollout(st);
      vals[j] += st.rules.evaluate(st, p);
    });
  }
  const adv = options.map((o, j) => vals[j] / N - (KING_GAMES[o.type].base / 4) * (team ? 2 : 1));
  let best = 0;
  adv.forEach((a, j) => { if (a > adv[best]) best = j; });
  return { choice: options[best], adv };
}
