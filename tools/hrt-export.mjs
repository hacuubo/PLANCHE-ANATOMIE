// Extrait les maillages d'un assets/heart.bin (HRT3 ou HRT2) dans un dossier : fichiers binaires bruts (positions
// float32 .pos, indices uint32 .idx, structures uint8 .sid) et index.json, lisibles par numpy (tools/check_model.py).
//   node tools/hrt-export.mjs <heart.bin> <dossier>
import fs from 'node:fs';
import path from 'node:path';
const [file, out] = process.argv.slice(2);
const buf = fs.readFileSync(file), u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
const magic = buf.slice(0, 4).toString(), v3f = magic === 'HRT3', h0 = v3f ? 12 : 8, hl = buf.readUInt32LE(4);
const header = JSON.parse(buf.slice(h0, h0 + hl).toString()), base = h0 + hl;
const view = (Type, [off, len]) => { const b = u8.slice(base + off, base + off + len * (Type.BYTES_PER_ELEMENT || 1)); return new Type(b.buffer, 0, len); };
const decP = (src, n) => { const q = new Uint16Array(n); for (let i = 0; i < n; i++) q[i] = ((i >= 3 ? q[i - 3] : 0) + (src[i] | (src[n + i] << 8))) & 0xffff; return q; };
const decI = (src, count) => { const o = new Uint32Array(count); let p = 0, hi = 0; for (let k = 0; k < count; k++) { let v = 0, s = 0, b; do { b = src[p++]; v |= (b & 0x7f) << s; s += 7; } while (b & 0x80); v >>>= 0; const i = hi - ((v >>> 1) ^ -(v & 1)); o[k] = i; if (i + 1 > hi) hi = i + 1; } return o; };
fs.mkdirSync(out, { recursive: true });
const { min, size } = header.bounds, index = { ids: header.ids, meshes: [] };
for (const m of header.meshes) {
  const q = v3f ? decP(view(Uint8Array, m.pos), m.pos[1] / 2) : view(Uint16Array, m.pos), p = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) { const k = i % 3; p[i] = min[k] + (q[i] / 65535) * size[k]; }
  const idx = v3f ? decI(view(Uint8Array, m.idx), m.icount) : Uint32Array.from(m.idx32 ? view(Uint32Array, m.idx) : view(Uint16Array, m.idx));
  const name = m.name.replace(/[:]/g, '_');
  fs.writeFileSync(path.join(out, name + '.pos'), Buffer.from(p.buffer));
  fs.writeFileSync(path.join(out, name + '.idx'), Buffer.from(idx.buffer));
  if (m.sid) fs.writeFileSync(path.join(out, name + '.sid'), Buffer.from(view(Uint8Array, m.sid)));
  index.meshes.push({ name, verts: p.length / 3, tris: idx.length / 3, sid: !!m.sid });
}
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index));
console.log(index.meshes.map((m) => `${m.name} ${m.verts}`).join('\n'));
