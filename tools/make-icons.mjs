// Génère icons/icon-192.png, icon-512.png et icon-512-maskable.png sans dépendance (encodeur PNG minimal).
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
// Cœur implicite : (x²+y²-1)³ - x²y³ ≤ 0 (x, y dans [-1.3, 1.3])
function draw(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const bg = [0xf4, 0xef, 0xe6], red = [0xb8, 0x43, 0x3c], cream = [0xff, 0xfd, 0xf9];
  const radius = maskable ? 0 : size * 0.22;
  const scale = maskable ? 0.62 : 0.78;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const o = (j * size + i) * 4;
    // coin arrondi
    const dx = Math.max(radius - i, i - (size - 1 - radius), 0), dy = Math.max(radius - j, j - (size - 1 - radius), 0);
    if (!maskable && dx * dx + dy * dy > radius * radius) { buf[o + 3] = 0; continue; }
    let col = bg;
    const x = ((i + 0.5) / size - 0.5) * 2.6 / scale, y = (0.5 - (j + 0.5) / size) * 2.6 / scale + 0.15;
    const f = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
    if (f <= 0) col = red;
    // trait ECG
    const ex = (i + 0.5) / size, ey = (j + 0.5) / size;
    const path = [[0.12, 0.56], [0.33, 0.56], [0.38, 0.45], [0.45, 0.72], [0.52, 0.38], [0.57, 0.56], [0.88, 0.56]];
    for (let k = 0; k < path.length - 1; k++) {
      const [ax, ay] = path[k], [bx, by] = path[k + 1];
      const t = Math.max(0, Math.min(1, ((ex - ax) * (bx - ax) + (ey - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
      const px = ax + t * (bx - ax), py = ay + t * (by - ay);
      if (Math.hypot(ex - px, ey - py) < 0.028 && f <= 0.02) col = cream;
    }
    buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; buf[o + 3] = 255;
  }
  return png(size, size, buf);
}
mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-192.png', draw(192));
writeFileSync('icons/icon-512.png', draw(512));
writeFileSync('icons/icon-512-maskable.png', draw(512, { maskable: true }));
console.log('icônes générées');
