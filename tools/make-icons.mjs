// Génère icons/icon-192.png, icon-512.png et icon-512-maskable.png sans dépendance (encodeur PNG minimal).
// Le dessin reprend icons/icon.svg (icône « planche ») : silhouette anatomique au trait d'encre, aplat rouge sur les
// ventricules, oreillette mauve, tronc pulmonaire bleu, sillon de graisse, pastille « 1 » avec ligne de rappel.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ── géométrie 2D dans le repère du SVG (64 × 64) ── */
const bez = (p0, p1, p2, p3, n = 48) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return out; };
const quad = (p0, p1, p2, n = 48) => bez(p0, [p0[0] + 2 / 3 * (p1[0] - p0[0]), p0[1] + 2 / 3 * (p1[1] - p0[1])], [p2[0] + 2 / 3 * (p1[0] - p2[0]), p2[1] + 2 / 3 * (p1[1] - p2[1])], p2, n);
function distPoly(x, y, pts) {
  let d = Infinity;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
    const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2));
    d = Math.min(d, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
  }
  return d;
}
function inside(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// tracés (mêmes points que icon.svg)
const AORTE = [...bez([31, 31], [30, 20], [34, 13], [42, 13]), ...bez([42, 13], [49, 13], [51, 19], [51, 28])];
const TP = quad([25, 31], [24, 25], [37, 22]);
const MASSE = [...bez([15.5, 34], [13, 44], [27, 56], [44.5, 57.5]), ...bez([44.5, 57.5], [50.5, 52], [51.5, 40], [47, 30.5]), ...bez([47, 30.5], [40, 26], [22, 26], [15.5, 34])];
const SILLON = quad([30.5, 29.5], [33.5, 37.5], [43.5, 54.5]);
const RAPPEL = [[38, 41], [52, 44]];
const ATR = { cx: 17.5, cy: 29.5, rx: 7.5, ry: 6.5 };
const PAST = { cx: 54.5, cy: 44.5, r: 4.6 };
// chiffre « 1 » : fût + empattement bas + crochet (trait serif simplifié)
const UN = [[[54.6, 41.6], [54.6, 47.2]], [[53.2, 47.2], [56.0, 47.2]], [[53.0, 43.0], [54.6, 41.6]]];

const PAPER = [0xf4, 0xef, 0xe6], INK = [0x2b, 0x24, 0x20], RED = [0xb8, 0x43, 0x3c], BLUE = [0x3e, 0x51, 0x9e], MAUVE = [0xa9, 0x8b, 0xb8], FAT = [0xf0, 0xc0, 0x70], CARD = [0xff, 0xfd, 0xf9], DARKRED = [0x7a, 0x2b, 0x26];

function colorAt(x, y) {
  // couches, de l'arrière vers l'avant (dernière couche opaque gagnante)
  let col = PAPER;
  const dA = distPoly(x, y, AORTE), dT = distPoly(x, y, TP);
  if (dA < 4.8) col = INK;
  if (dA < 3.2) col = RED;
  if (dT < 3.7) col = INK;
  if (dT < 2.3) col = BLUE;
  const ex = (x - ATR.cx) / ATR.rx, ey = (y - ATR.cy) / ATR.ry, re = Math.hypot(ex, ey);
  if (re < 1 + 0.8 / ATR.rx) col = INK;
  if (re < 1 - 0.8 / ATR.rx) col = MAUVE;
  const dM = distPoly(x, y, MASSE), inM = inside(x, y, MASSE);
  if (inM || dM < 0.85) col = INK;
  if (inM && dM > 0.85) col = RED;
  if (inM && dM > 0.85) { const dS = distPoly(x, y, SILLON); if (dS < 1.1) col = FAT; if (dS < 0.4) col = DARKRED; }
  if (distPoly(x, y, RAPPEL) < 0.45) col = INK;
  if (Math.hypot(x - RAPPEL[0][0], y - RAPPEL[0][1]) < 1) col = INK;
  const dP = Math.hypot(x - PAST.cx, y - PAST.cy);
  if (dP < PAST.r + 0.45) col = INK;
  if (dP < PAST.r - 0.45) col = CARD;
  if (dP < PAST.r - 0.45 && UN.some((seg) => distPoly(x, y, seg) < 0.5)) col = INK;
  return col;
}

function draw(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  const scale = maskable ? 0.74 : 1; // zone de sécurité maskable : dessin dans le cercle central de 80 %
  const ss = 3; // suréchantillonnage 3 × 3
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const o = (j * size + i) * 4;
    const dx = Math.max(radius - i, i - (size - 1 - radius), 0), dy = Math.max(radius - j, j - (size - 1 - radius), 0);
    if (!maskable && dx * dx + dy * dy > radius * radius) { buf[o + 3] = 0; continue; }
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const x = ((i + (sx + 0.5) / ss) / size - 0.5) * 64 / scale + 32, y = ((j + (sy + 0.5) / ss) / size - 0.5) * 64 / scale + 32;
      const c = colorAt(x, y); r += c[0]; g += c[1]; b += c[2];
    }
    buf[o] = Math.round(r / (ss * ss)); buf[o + 1] = Math.round(g / (ss * ss)); buf[o + 2] = Math.round(b / (ss * ss)); buf[o + 3] = 255;
  }
  return png(size, size, buf);
}
mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-192.png', draw(192));
writeFileSync('icons/icon-512.png', draw(512));
writeFileSync('icons/icon-512-maskable.png', draw(512, { maskable: true }));
console.log('icônes générées');
