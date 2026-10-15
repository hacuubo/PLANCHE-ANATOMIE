// Extraction d'une surface fermée (iso-0) d'un champ de distance signée par « surface nets » :
// un sommet par cellule traversée, une face par arête traversée. Grille grossière puis raffinement près de la surface.
// field(x, y, z) → distance signée (négative à l'intérieur), bounds { min:[..], max:[..] }, h = pas fin (cm).
export function surfaceNets(field, bounds, h, { project = 2 } = {}) {
  const C = 4; // cellules fines par cellule grossière
  const cn = [0, 1, 2].map((k) => Math.max(1, Math.ceil((bounds.max[k] - bounds.min[k]) / (h * C))));
  const n = cn.map((v) => v * C);
  const NX = n[0] + 1, NY = n[1] + 1, NZ = n[2] + 1;
  const o = bounds.min;
  const total = NX * NY * NZ;
  const val = new Float32Array(total), done = new Uint8Array(total);
  const nodeIdx = (i, j, k) => (k * NY + j) * NX + i;
  const get = (i, j, k) => {
    const id = nodeIdx(i, j, k);
    if (!done[id]) { val[id] = field(o[0] + i * h, o[1] + j * h, o[2] + k * h); done[id] = 1; }
    return val[id];
  };
  const CX = cn[0] + 1, CY = cn[1] + 1;
  const thr = 1.5 * C * h;
  const active = [];
  for (let k = 0; k < cn[2]; k++) for (let j = 0; j < cn[1]; j++) for (let i = 0; i < cn[0]; i++) {
    let mn = 1e9, neg = false, pos = false;
    for (let c = 0; c < 8; c++) {
      const v = get((i + (c & 1)) * C, (j + (c >> 1 & 1)) * C, (k + (c >> 2 & 1)) * C);
      mn = Math.min(mn, Math.abs(v)); if (v < 0) neg = true; else pos = true;
    }
    if (mn < thr || (neg && pos)) active.push([i, j, k]);
  }
  const verts = [], vmap = new Map();
  const cellKey = (i, j, k) => (k * n[1] + j) * n[0] + i;
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const scan = [];
  for (const [ci, cj, ck] of active) {
    for (let fk = 0; fk < C; fk++) for (let fj = 0; fj < C; fj++) for (let fi = 0; fi < C; fi++) {
      const i = ci * C + fi, j = cj * C + fj, k = ck * C + fk;
      scan.push(i, j, k);
      const cv = [];
      let neg = 0;
      for (let c = 0; c < 8; c++) { const v = get(i + (c & 1), j + (c >> 1 & 1), k + (c >> 2 & 1)); cv.push(v); if (v < 0) neg++; }
      if (neg === 0 || neg === 8) continue;
      let sx = 0, sy = 0, sz = 0, m = 0;
      for (const [a, b] of EDGES) {
        const va = cv[a], vb = cv[b];
        if ((va < 0) === (vb < 0)) continue;
        const t = va / (va - vb);
        sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t; sz += (a >> 2 & 1) + ((b >> 2 & 1) - (a >> 2 & 1)) * t;
        m++;
      }
      vmap.set(cellKey(i, j, k), verts.length);
      verts.push([o[0] + (i + sx / m) * h, o[1] + (j + sy / m) * h, o[2] + (k + sz / m) * h]);
    }
  }
  const tris = [];
  const dist2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  const quad = (a, b, c, d, flip) => {
    if (a === undefined || b === undefined || c === undefined || d === undefined) return;
    const q = flip ? [a, d, c, b] : [a, b, c, d];
    if (dist2(verts[q[0]], verts[q[2]]) <= dist2(verts[q[1]], verts[q[3]])) tris.push(q[0], q[1], q[2], q[0], q[2], q[3]);
    else tris.push(q[0], q[1], q[3], q[1], q[2], q[3]);
  };
  const V = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2]) ? undefined : vmap.get(cellKey(i, j, k));
  for (let s = 0; s < scan.length; s += 3) {
    const i = scan[s], j = scan[s + 1], k = scan[s + 2];
    const inside = get(i, j, k) < 0;
    if ((get(i + 1, j, k) < 0) !== inside) quad(V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k), !inside);
    if ((get(i, j + 1, k) < 0) !== inside) quad(V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1), !inside);
    if ((get(i, j, k + 1) < 0) !== inside) quad(V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k), !inside);
  }
  // projection sur la surface exacte et normales = gradient
  const e = h * 0.3;
  const grad = (p) => {
    const g = [field(p[0] + e, p[1], p[2]) - field(p[0] - e, p[1], p[2]), field(p[0], p[1] + e, p[2]) - field(p[0], p[1] - e, p[2]), field(p[0], p[1], p[2] + e) - field(p[0], p[1], p[2] - e)];
    const l = Math.hypot(...g) || 1;
    return [g[0] / l, g[1] / l, g[2] / l];
  };
  const normals = [];
  for (const p of verts) {
    for (let it = 0; it < project; it++) {
      const d = field(p[0], p[1], p[2]);
      const g = grad(p);
      const st = Math.max(-h, Math.min(h, d));
      p[0] -= g[0] * st; p[1] -= g[1] * st; p[2] -= g[2] * st;
    }
    normals.push(grad(p));
  }
  return { verts, normals, tris };
}
