// Génère assets/heart.bin : maillage continu de l'enveloppe du cœur (masse ventriculaire, oreillettes, auricules,
// graisse des sillons, gros vaisseaux), extrait de la fonction de distance de js/heart-shape.js par « surface nets ».
//   node tools/build-heart-mesh.mjs            (≈ 1 min)
// Deux niveaux de détail : « visuel » (pas de 0,085 cm, attributs de couleur, tissu, occlusion ambiante cuite)
// et « proxy » (pas de 0,25 cm, sert au clic et au masquage des étiquettes).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from '../js/heart-shape.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function surfaceNets(h, { attributes = true } = {}) {
  const t0 = Date.now();
  const b = S.bounds();
  const C = 4; // cellules fines par cellule grossière
  const cn = [0, 1, 2].map((k) => Math.ceil((b.max[k] - b.min[k]) / (h * C)));
  const n = cn.map((v) => v * C);                 // cellules fines
  const NX = n[0] + 1, NY = n[1] + 1, NZ = n[2] + 1; // nœuds fins
  const o = b.min;
  const nodeIdx = (i, j, k) => (k * NY + j) * NX + i;
  const val = new Float32Array(NX * NY * NZ);
  const done = new Uint8Array(NX * NY * NZ);
  const P = (i, j, k) => [o[0] + i * h, o[1] + j * h, o[2] + k * h];
  const get = (i, j, k) => {
    const id = nodeIdx(i, j, k);
    if (!done[id]) { const p = P(i, j, k); val[id] = S.field(p[0], p[1], p[2]); done[id] = 1; }
    return val[id];
  };
  // 1) grille grossière : on ne raffine que les cellules proches de la surface
  const CX = cn[0] + 1, CY = cn[1] + 1, CZ = cn[2] + 1;
  const cval = new Float32Array(CX * CY * CZ);
  for (let k = 0; k < CZ; k++) for (let j = 0; j < CY; j++) for (let i = 0; i < CX; i++) cval[(k * CY + j) * CX + i] = get(i * C, j * C, k * C);
  const thr = 1.5 * C * h;
  const active = [];
  for (let k = 0; k < cn[2]; k++) for (let j = 0; j < cn[1]; j++) for (let i = 0; i < cn[0]; i++) {
    let mn = 1e9, neg = false, pos = false;
    for (let c = 0; c < 8; c++) {
      const v = cval[((k + (c >> 2 & 1)) * CY + (j + (c >> 1 & 1))) * CX + (i + (c & 1))];
      mn = Math.min(mn, Math.abs(v)); if (v < 0) neg = true; else pos = true;
    }
    if (mn < thr || (neg && pos)) active.push([i, j, k]);
  }
  // 2) un sommet par cellule fine traversée par la surface (moyenne des points de passage sur les arêtes)
  const verts = [], vmap = new Map();
  const cellKey = (i, j, k) => (k * n[1] + j) * n[0] + i;
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cellsToScan = [];
  for (const [ci, cj, ck] of active) {
    for (let fk = 0; fk < C; fk++) for (let fj = 0; fj < C; fj++) for (let fi = 0; fi < C; fi++) {
      const i = ci * C + fi, j = cj * C + fj, k = ck * C + fk;
      cellsToScan.push(i, j, k);
      const cv = [];
      let neg = 0;
      for (let c = 0; c < 8; c++) { const v = get(i + (c & 1), j + (c >> 1 & 1), k + (c >> 2 & 1)); cv.push(v); if (v < 0) neg++; }
      if (neg === 0 || neg === 8) continue;
      let sx = 0, sy = 0, sz = 0, m = 0;
      for (const [a, bb] of EDGES) {
        const va = cv[a], vb = cv[bb];
        if ((va < 0) === (vb < 0)) continue;
        const t = va / (va - vb);
        sx += (a & 1) + ((bb & 1) - (a & 1)) * t; sy += (a >> 1 & 1) + ((bb >> 1 & 1) - (a >> 1 & 1)) * t; sz += (a >> 2 & 1) + ((bb >> 2 & 1) - (a >> 2 & 1)) * t;
        m++;
      }
      vmap.set(cellKey(i, j, k), verts.length);
      verts.push([o[0] + (i + sx / m) * h, o[1] + (j + sy / m) * h, o[2] + (k + sz / m) * h]);
    }
  }
  // 3) une face par arête de grille traversée (quadrilatère reliant les 4 cellules voisines)
  const tris = [];
  const quad = (a, b, c, d, flip) => {
    if (a === undefined || b === undefined || c === undefined || d === undefined) return;
    const q = flip ? [a, d, c, b] : [a, b, c, d];
    const d02 = dist2(verts[q[0]], verts[q[2]]), d13 = dist2(verts[q[1]], verts[q[3]]);
    if (d02 <= d13) tris.push(q[0], q[1], q[2], q[0], q[2], q[3]);
    else tris.push(q[0], q[1], q[3], q[1], q[2], q[3]);
  };
  const dist2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  const V = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2]) ? undefined : vmap.get(cellKey(i, j, k));
  for (let s = 0; s < cellsToScan.length; s += 3) {
    const i = cellsToScan[s], j = cellsToScan[s + 1], k = cellsToScan[s + 2];
    const v0 = get(i, j, k);
    const inside = v0 < 0;
    if ((get(i + 1, j, k) < 0) !== inside) quad(V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k), !inside);
    if ((get(i, j + 1, k) < 0) !== inside) quad(V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1), !inside);
    if ((get(i, j, k + 1) < 0) !== inside) quad(V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k), !inside);
  }
  // 4) projection des sommets sur la surface exacte, normales = gradient de la distance
  const e = h * 0.3;
  const grad = (p) => {
    const gx = S.field(p[0] + e, p[1], p[2]) - S.field(p[0] - e, p[1], p[2]);
    const gy = S.field(p[0], p[1] + e, p[2]) - S.field(p[0], p[1] - e, p[2]);
    const gz = S.field(p[0], p[1], p[2] + e) - S.field(p[0], p[1], p[2] - e);
    const l = Math.hypot(gx, gy, gz) || 1;
    return [gx / l, gy / l, gz / l];
  };
  const normals = [];
  for (const p of verts) {
    for (let it = 0; it < 2; it++) {
      const d = S.field(p[0], p[1], p[2]);
      const g = grad(p);
      const step = Math.max(-h, Math.min(h, d));
      p[0] -= g[0] * step; p[1] -= g[1] * step; p[2] -= g[2] * step;
    }
    normals.push(grad(p));
  }
  const out = { h, verts, normals, tris, ms: Date.now() - t0 };
  if (!attributes) {
    out.sid = verts.map((p) => S.attributes(p[0], p[1], p[2]).sid);
    return out;
  }
  // 5) attributs : structure, couleur, tissu, occlusion ambiante (distance de la surface aux obstacles voisins)
  const occ = (x, y, z) => Math.min(S.field(x, y, z), S.coronaryField(x, y, z));
  const AO_D = [0.12, 0.3, 0.6, 1.0, 1.6], AO_W = [0.3, 0.25, 0.2, 0.15, 0.1];
  out.attrs = verts.map((p, vi) => {
    const a = S.attributes(p[0], p[1], p[2]);
    const nn = normals[vi];
    let oc = 0;
    for (let s = 0; s < AO_D.length; s++) {
      const dd = AO_D[s];
      const f = occ(p[0] + nn[0] * dd, p[1] + nn[1] * dd, p[2] + nn[2] * dd);
      oc += AO_W[s] * Math.min(1, Math.max(0, (dd - f) / dd));
    }
    a.ao = Math.min(1, Math.max(0.15, 1 - 1.25 * oc));
    return a;
  });
  out.ms = Date.now() - t0;
  return out;
}

/* ─────────── écriture binaire ─────────── */
const chunks = [];
let offset = 0;
function push(typed) {
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const pad = (4 - (buf.length % 4)) % 4;
  const at = offset;
  chunks.push(buf, Buffer.alloc(pad));
  offset += buf.length + pad;
  return [at, typed.length];
}

const visual = surfaceNets(0.1, { attributes: true });
console.log(`visuel : ${visual.verts.length} sommets, ${visual.tris.length / 3} triangles, ${(visual.ms / 1000).toFixed(1)} s`);
const proxy = surfaceNets(0.25, { attributes: false });
console.log(`proxy  : ${proxy.verts.length} sommets, ${proxy.tris.length / 3} triangles, ${(proxy.ms / 1000).toFixed(1)} s`);

const bb = S.bounds();
const size = [0, 1, 2].map((k) => bb.max[k] - bb.min[k]);
const quant = (verts) => {
  const q = new Uint16Array(verts.length * 3);
  verts.forEach((p, i) => { for (let k = 0; k < 3; k++) q[i * 3 + k] = Math.round(Math.min(1, Math.max(0, (p[k] - bb.min[k]) / size[k])) * 65535); });
  return q;
};
const lods = [];
{
  const v = visual;
  const nor = new Int16Array(v.verts.length * 3);
  v.normals.forEach((nn, i) => { for (let k = 0; k < 3; k++) nor[i * 3 + k] = Math.round(nn[k] * 32767); });
  const col = new Uint8Array(v.verts.length * 4), tis = new Uint8Array(v.verts.length * 4);
  v.attrs.forEach((a, i) => {
    for (let k = 0; k < 3; k++) { col[i * 4 + k] = Math.round(a.color[k] * 255); tis[i * 4 + k] = Math.round(a.tis[k] * 255); }
    col[i * 4 + 3] = Math.round(a.ao * 255);
    tis[i * 4 + 3] = a.sid;
  });
  lods.push({ name: 'visuel', vcount: v.verts.length, icount: v.tris.length,
    pos: push(quant(v.verts)), nor: push(nor), col: push(col), tis: push(tis), idx: push(new Uint32Array(v.tris)) });
}
{
  const v = proxy;
  lods.push({ name: 'proxy', vcount: v.verts.length, icount: v.tris.length,
    pos: push(quant(v.verts)), sid: push(new Uint8Array(v.sid)), idx: push(new Uint32Array(v.tris)) });
}
const header = Buffer.from(JSON.stringify({ ids: S.ENVELOPPE_IDS, bounds: { min: bb.min, size }, lods, coronaires: S.coronaryPaths() }), 'utf8');
const hpad = (4 - (header.length % 4)) % 4;
const pre = Buffer.alloc(8);
pre.write('HRT1', 0, 'ascii');
pre.writeUInt32LE(header.length + hpad, 4);
const file = Buffer.concat([pre, header, Buffer.alloc(hpad, 0x20), ...chunks]);
mkdirSync(join(ROOT, 'assets'), { recursive: true });
writeFileSync(join(ROOT, 'assets', 'heart.bin'), file);
console.log(`assets/heart.bin : ${(file.length / 1048576).toFixed(2)} Mo`);
