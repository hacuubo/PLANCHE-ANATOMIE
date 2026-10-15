// Distance signée approchée à un maillage triangulé, même non étanche (cas des maillages BodyParts3D réduits) :
// distance au triangle le plus proche (grille d'accélération), signe donné par la normale de sommet interpolée
// au point le plus proche (positif à l'extérieur). Robuste pour des formes organiques lisses à petits trous.

export class MeshSDF {
  constructor(pos, idx, { cell = 0.5 } = {}) {
    this.pos = pos; this.idx = idx; this.cell = cell;
    const nv = pos.length / 3, nt = idx.length / 3;
    const vn = new Float64Array(nv * 3);
    for (let t = 0; t < nt; t++) {
      const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; // pondération par l'aire
      for (const k of [a, b, c]) { vn[k] += nx; vn[k + 1] += ny; vn[k + 2] += nz; }
    }
    for (let i = 0; i < nv; i++) { const l = Math.hypot(vn[i * 3], vn[i * 3 + 1], vn[i * 3 + 2]) || 1; vn[i * 3] /= l; vn[i * 3 + 1] /= l; vn[i * 3 + 2] /= l; }
    this.vn = vn;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos[i * 3 + k]); mx[k] = Math.max(mx[k], pos[i * 3 + k]); }
    this.bmin = mn; this.bmax = mx;
    this.o = mn.map((v) => v - cell * 0.5);
    this.n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((mx[k] - this.o[k]) / cell + 0.5)));
    const cellOf = (v, k) => Math.min(this.n[k] - 1, Math.max(0, Math.floor((v - this.o[k]) / cell)));
    const lists = new Map();
    for (let t = 0; t < nt; t++) {
      const r = [0, 1, 2].map((k) => { const vs = [pos[idx[t * 3] * 3 + k], pos[idx[t * 3 + 1] * 3 + k], pos[idx[t * 3 + 2] * 3 + k]]; return [cellOf(Math.min(...vs), k), cellOf(Math.max(...vs), k)]; });
      for (let z = r[2][0]; z <= r[2][1]; z++) for (let y = r[1][0]; y <= r[1][1]; y++) for (let x = r[0][0]; x <= r[0][1]; x++) {
        const key = (z * this.n[1] + y) * this.n[0] + x;
        let l = lists.get(key); if (!l) lists.set(key, l = []); l.push(t);
      }
    }
    this.lists = lists;
    this.stamp = new Uint32Array(nt); this.qid = 0;
    this.buildInside(0.25);
  }
  // Voxels : 0 = extérieur (atteint depuis le bord), 1 = surface (dilatée d'un voxel : bouche les petits trous),
  // 2 = intérieur. Donne un signe fiable loin de la surface, là où la recherche du triangle le plus proche s'arrête.
  buildInside(v) {
    const { pos, idx } = this;
    const o = this.bmin.map((x) => x - 2 * v), n = [0, 1, 2].map((k) => Math.ceil((this.bmax[k] - this.bmin[k]) / v) + 5);
    const g = new Uint8Array(n[0] * n[1] * n[2]);
    const id = (i, j, k) => (k * n[1] + j) * n[0] + i;
    const nt = idx.length / 3;
    for (let t = 0; t < nt; t++) {
      const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
      const lab = Math.hypot(pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]);
      const lac = Math.hypot(pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]);
      const m = Math.max(1, Math.ceil(Math.max(lab, lac) / (v * 0.5)));
      for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) {
        const u = i / m, w = j / m;
        const x = pos[a] + (pos[b] - pos[a]) * u + (pos[c] - pos[a]) * w;
        const y = pos[a + 1] + (pos[b + 1] - pos[a + 1]) * u + (pos[c + 1] - pos[a + 1]) * w;
        const z = pos[a + 2] + (pos[b + 2] - pos[a + 2]) * u + (pos[c + 2] - pos[a + 2]) * w;
        g[id(Math.floor((x - o[0]) / v), Math.floor((y - o[1]) / v), Math.floor((z - o[2]) / v))] = 1;
      }
    }
    const g2 = g.slice();
    for (let k = 1; k < n[2] - 1; k++) for (let j = 1; j < n[1] - 1; j++) for (let i = 1; i < n[0] - 1; i++) {
      if (!g[id(i, j, k)]) continue;
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) g2[id(i + dx, j + dy, k + dz)] = 1;
    }
    const ext = new Uint8Array(g2.length);
    const stack = [0]; ext[0] = 1;
    const D = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    while (stack.length) {
      const c = stack.pop();
      const i = c % n[0], j = Math.floor(c / n[0]) % n[1], k = Math.floor(c / (n[0] * n[1]));
      for (const [dx, dy, dz] of D) {
        const a = i + dx, b = j + dy, cc = k + dz;
        if (a < 0 || b < 0 || cc < 0 || a >= n[0] || b >= n[1] || cc >= n[2]) continue;
        const q = id(a, b, cc);
        if (ext[q] || g2[q]) continue;
        ext[q] = 1; stack.push(q);
      }
    }
    for (let q = 0; q < g2.length; q++) g2[q] = ext[q] ? 0 : g2[q] ? 1 : 2;
    this.vox = { g: g2, o, n, v };
  }
  // 0 extérieur, 1 indéterminé (près de la surface), 2 intérieur
  side(x, y, z) {
    const { g, o, n, v } = this.vox;
    const i = Math.floor((x - o[0]) / v), j = Math.floor((y - o[1]) / v), k = Math.floor((z - o[2]) / v);
    if (i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2]) return 0;
    return g[(k * n[1] + j) * n[0] + i];
  }
  // Distance signée (cm). maxR : au-delà, on renvoie ±maxR (signe du triangle le plus proche trouvé, sinon +).
  query(x, y, z, maxR = 6) {
    const { o, n, cell, pos, idx, vn } = this;
    const ci = [x, y, z].map((v, k) => Math.min(n[k] - 1, Math.max(0, Math.floor((v - o[k]) / cell))));
    // distance de p à la boîte de la grille (borne inférieure pour les cases)
    let out2 = 0;
    for (let k = 0; k < 3; k++) { const v = [x, y, z][k], lo = o[k], hi = o[k] + n[k] * cell; if (v < lo) out2 += (lo - v) ** 2; else if (v > hi) out2 += (v - hi) ** 2; }
    const out = Math.sqrt(out2);
    if (out > maxR) return out; // loin de la pièce : borne inférieure, à l'extérieur
    const q = ++this.qid;
    let best = Infinity, bt = -1, bu = 0, bv = 0, bw = 0, bqx = 0, bqy = 0, bqz = 0;
    const rmax = Math.max(n[0], n[1], n[2]);
    for (let r = 0; r <= rmax; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
        const cx = ci[0] + dx, cy = ci[1] + dy, cz = ci[2] + dz;
        if (cx < 0 || cy < 0 || cz < 0 || cx >= n[0] || cy >= n[1] || cz >= n[2]) continue;
        const l = this.lists.get((cz * n[1] + cy) * n[0] + cx);
        if (!l) continue;
        for (const t of l) {
          if (this.stamp[t] === q) continue;
          this.stamp[t] = q;
          const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
          const res = closest(x, y, z, pos[a], pos[a + 1], pos[a + 2], pos[b], pos[b + 1], pos[b + 2], pos[c], pos[c + 1], pos[c + 2]);
          const d2 = (x - res[0]) ** 2 + (y - res[1]) ** 2 + (z - res[2]) ** 2;
          if (d2 < best) { best = d2; bt = t; bqx = res[0]; bqy = res[1]; bqz = res[2]; bu = res[3]; bv = res[4]; bw = res[5]; }
        }
      }
      const lim = r * cell + out;
      if (best <= lim * lim || lim > maxR + cell) break;
    }
    const sd = this.side(x, y, z);
    if (bt < 0) return sd === 2 ? -maxR : maxR;
    const a = idx[bt * 3] * 3, b = idx[bt * 3 + 1] * 3, c = idx[bt * 3 + 2] * 3;
    const nx = bu * vn[a] + bv * vn[b] + bw * vn[c], ny = bu * vn[a + 1] + bv * vn[b + 1] + bw * vn[c + 1], nz = bu * vn[a + 2] + bv * vn[b + 2] + bw * vn[c + 2];
    const s = sd === 0 ? 1 : sd === 2 ? -1 : ((x - bqx) * nx + (y - bqy) * ny + (z - bqz) * nz >= 0 ? 1 : -1);
    return s * Math.min(Math.sqrt(best), maxR);
  }
  // Distance non signée (pour les structures minces : feuillets, vaisseaux fins en occlusion).
  unsigned(x, y, z, maxR = 6) { return Math.abs(this.query(x, y, z, maxR)); }
}

// Point le plus proche sur un triangle (Ericson, Real-Time Collision Detection) : [qx, qy, qz, u, v, w] (barycentriques a, b, c).
function closest(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return [ax, ay, az, 1, 0, 0];
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return [bx, by, bz, 0, 1, 0];
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [ax + v * abx, ay + v * aby, az + v * abz, 1 - v, v, 0]; }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return [cx, cy, cz, 0, 0, 1];
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [ax + w * acx, ay + w * acy, az + w * acz, 1 - w, 0, w]; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [bx + w * (cx - bx), by + w * (cy - by), bz + w * (cz - bz), 0, 1 - w, w]; }
  const denom = 1 / (va + vb + vc), v = vb * denom, w = vc * denom;
  return [ax + abx * v + acx * w, ay + aby * v + acy * w, az + abz * v + acz * w, 1 - v - w, v, w];
}

// Nuage de points avec recherche du plus proche (grille) : distance minimale à un ensemble de points.
export class PointCloud {
  constructor(points, cell = 0.5) {
    this.cell = cell; this.map = new Map(); this.points = points;
    points.forEach((p, i) => { const k = this.key(p[0], p[1], p[2]); let l = this.map.get(k); if (!l) this.map.set(k, l = []); l.push(i); });
  }
  key(x, y, z) { const c = this.cell; return this.k3(Math.floor(x / c), Math.floor(y / c), Math.floor(z / c)); }
  k3(i, j, k) { return ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512); }
  // plus proche voisin dans un rayon (en cases) ; renvoie { d, i } ou { d: Infinity }
  nearest(x, y, z, rCells = 3) {
    const c = this.cell, cx = Math.floor(x / c), cy = Math.floor(y / c), cz = Math.floor(z / c);
    let best = Infinity, bi = -1;
    for (let dz = -rCells; dz <= rCells; dz++) for (let dy = -rCells; dy <= rCells; dy++) for (let dx = -rCells; dx <= rCells; dx++) {
      const l = this.map.get(this.k3(cx + dx, cy + dy, cz + dz)); if (!l) continue;
      for (const i of l) { const p = this.points[i]; const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < best) { best = d; bi = i; } }
    }
    return { d: Math.sqrt(best), i: bi };
  }
  // tous les voisins dans un rayon r (cm)
  within(x, y, z, r) {
    const c = this.cell, rc = Math.ceil(r / c), cx = Math.floor(x / c), cy = Math.floor(y / c), cz = Math.floor(z / c), out = [];
    for (let dz = -rc; dz <= rc; dz++) for (let dy = -rc; dy <= rc; dy++) for (let dx = -rc; dx <= rc; dx++) {
      const l = this.map.get(this.k3(cx + dx, cy + dy, cz + dz)); if (!l) continue;
      for (const i of l) { const p = this.points[i]; const d2 = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d2 <= r * r) out.push([i, Math.sqrt(d2)]); }
    }
    return out;
  }
}
