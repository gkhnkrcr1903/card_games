// Ortak kart yardımcıları. Renkler: 0 ♠, 1 ♥, 2 ♦, 3 ♣ ; değerler 2..14 (A=14)
export const SUITS = ['♠', '♥', '♦', '♣'];
export const SUIT_NAMES = ['Maça', 'Kupa', 'Karo', 'Sinek'];
export const rankStr = r => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[r] || String(r);
export const cardStr = c => SUITS[c.s] + rankStr(c.r);
export const isRed = s => s === 1 || s === 2;
export const sameCard = (a, b) => a.s === b.s && a.r === b.r;

export function makeDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ s, r });
  return d;
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Görüntü sırası: siyah/kırmızı dönüşümlü (♠ ♥ ♣ ♦)
const ORDER = [0, 1, 3, 2];
export function sortHand(h) {
  h.sort((a, b) => ORDER.indexOf(a.s) - ORDER.indexOf(b.s) || b.r - a.r);
  return h;
}

export function dealHands() {
  const d = shuffle(makeDeck());
  const h = [[], [], [], []];
  d.forEach((c, i) => h[i % 4].push(c));
  h.forEach(sortHand);
  return h;
}

export const hcp = h => h.reduce((t, c) => t + (c.r > 10 ? c.r - 10 : 0), 0);
export function lengths(h) {
  const l = [0, 0, 0, 0];
  h.forEach(c => l[c.s]++);
  return l;
}
// 4333, 4432, 5332
export function isBalanced(h) {
  const l = lengths(h).sort((a, b) => a - b);
  return l[0] >= 2 && l[1] >= 3;
}
