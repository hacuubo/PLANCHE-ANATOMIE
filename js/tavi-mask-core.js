// Calcul du champ de l'animation de la TAVI (js/heart.js, buildTaviMask) : JavaScript pur, sans three.js, pour tourner
// dans un worker (js/tavi-mask-worker.js) — un million de voxels, plusieurs secondes : hors du fil principal, l'image ne
// se fige pas — ou, à défaut, sur place. Entrées : tableaux de sommets (cm, repère du cœur), sortie : texture RGBA,
// ruban de l'ouverture et gouttière (voir le commentaire de js/heart.js pour le sens de chaque canal).
//   input = { envPos, envSid, paSids, veinPos, veinIdx, artPos, cavPos, cl: [[x, y, z]…], nObs: [x, y, z] }
//   sortie = { data, nx, ny, nz, lo: [x, y, z], VS, ribbon: { pos, idx }, liner: { pos, nrm, idx } }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]), norm = (a) => mul(a, 1 / (len(a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function computeTaviMask({ envPos, envSid, paSids, veinPos, veinIdx, artPos, cavPos, cl: cl0, nObs }) {
  const PA = new Set(paSids), nE = envSid.length, nV = veinPos.length / 3, nA = artPos.length / 3, nC = cavPos.length / 3;
  // pièces de la lumière veineuse (sommets reliés par les triangles), et celles qui sont l'artère pulmonaire
  const par = Int32Array.from({ length: nV }, (_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let i = 0; i < veinIdx.length; i += 3) { const a = find(veinIdx[i]); par[find(veinIdx[i + 1])] = a; par[find(veinIdx[i + 2])] = a; }
  const vote = new Map();
  for (let i = 0; i < nV; i += 23) { // un point sur 23 suffit au vote
    const x = veinPos[3 * i], y = veinPos[3 * i + 1], z = veinPos[3 * i + 2];
    let best = Infinity, j = 0;
    for (let e = 0, o = 0; e < nE; e++, o += 3) { const d = (envPos[o] - x) ** 2 + (envPos[o + 1] - y) ** 2 + (envPos[o + 2] - z) ** 2; if (d < best) { best = d; j = e; } }
    const r = find(i), v = vote.get(r) ?? [0, 0]; v[PA.has(envSid[j]) ? 0 : 1]++; vote.set(r, v);
  }
  const paLum = new Uint8Array(nV); for (let i = 0; i < nV; i++) { const v = vote.get(find(i)); paLum[i] = v && v[0] > v[1] ? 1 : 0; }
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const grow = (P, i) => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[3 * i + k]); hi[k] = Math.max(hi[k], P[3 * i + k]); } };
  for (let i = 0; i < nV; i++) if (paLum[i]) grow(veinPos, i);
  for (let i = 0; i < nA; i++) grow(artPos, i);
  for (let k = 0; k < 3; k++) { lo[k] -= 1.8; hi[k] += 1.8; }
  const VS = 0.15, nx = Math.ceil((hi[0] - lo[0]) / VS), ny = Math.ceil((hi[1] - lo[1]) / VS), nz = Math.ceil((hi[2] - lo[2]) / VS), N = nx * ny * nz;
  const nbO = [], nbW = []; // voisins déjà parcourus (passe avant) ; la passe arrière prend les opposés
  for (let c = -1; c <= 0; c++) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (c < 0 || b < 0 || (b === 0 && a < 0)) { nbO.push(a + nx * (b + ny * c)); nbW.push(VS * Math.hypot(a, b, c)); }
  // distance aux sommets retenus (graines au centre de leur voxel, distance exacte), propagée par chanfrein
  const field = (sets) => {
    const dist = new Float32Array(N).fill(Infinity);
    for (const [P, n, keep] of sets) for (let i = 0; i < n; i++) {
      if (!keep(i)) continue;
      const px = P[3 * i], py = P[3 * i + 1], pz = P[3 * i + 2];
      const x = Math.floor((px - lo[0]) / VS), y = Math.floor((py - lo[1]) / VS), z = Math.floor((pz - lo[2]) / VS);
      if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) continue;
      const k = x + nx * (y + ny * z), d = Math.hypot(px - lo[0] - (x + 0.5) * VS, py - lo[1] - (y + 0.5) * VS, pz - lo[2] - (z + 0.5) * VS);
      if (d < dist[k]) dist[k] = d;
    }
    const nn = nbO.length;
    for (let pass = 0; pass < 2; pass++) for (const s of [1, -1]) {
      for (let z0 = 1; z0 < nz - 1; z0++) for (let y0 = 1; y0 < ny - 1; y0++) for (let x0 = 1; x0 < nx - 1; x0++) {
        const k = s > 0 ? x0 + nx * (y0 + ny * z0) : (nx - 1 - x0) + nx * ((ny - 1 - y0) + ny * (nz - 1 - z0));
        let m = dist[k];
        for (let j = 0; j < nn; j++) { const v = dist[k + s * nbO[j]] + nbW[j]; if (v < m) m = v; }
        dist[k] = m;
      }
    }
    return dist;
  };
  const all = () => true;
  const dPA = field([[veinPos, nV, (i) => paLum[i] === 1]]), dA = field([[artPos, nA, all]]), dC = field([[veinPos, nV, (i) => paLum[i] === 0], [cavPos, nC, all]]);
  // ligne centrale prolongée de 6 cm au-delà de son dernier point (l'aorte descendante continue) ; abscisses
  const cl = cl0.map((v) => v.slice()), m0 = cl.length;
  cl.push(add(cl[m0 - 1], mul(norm(sub(cl[m0 - 1], cl[m0 - 2])), 6)));
  const arc = [0]; for (let i = 1; i < cl.length; i++) arc.push(arc[i - 1] + len(sub(cl[i], cl[i - 1])));
  // surface de l'ouverture : n·(p − c) = 0 (c : point le plus proche de la ligne centrale)
  const seg = cl.slice(1).map((c, k) => sub(c, cl[k])), segL2 = seg.map((v) => dot(v, v)), segL = segL2.map(Math.sqrt);
  let cx = 0, cy = 0, cz = 0; // point le plus proche, mis à jour par nearest()
  const nearest = (qx, qy, qz) => {
    let bd = Infinity, bs = 0;
    for (let k = 0; k < seg.length; k++) {
      const v = seg[k], c = cl[k], s = Math.min(1, Math.max(0, ((qx - c[0]) * v[0] + (qy - c[1]) * v[1] + (qz - c[2]) * v[2]) / segL2[k]));
      const dx = qx - c[0] - s * v[0], dy = qy - c[1] - s * v[1], dz = qz - c[2] - s * v[2], d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; bs = k + s; }
    }
    const k = Math.min(seg.length - 1, Math.floor(bs)), f = bs - k;
    cx = cl[k][0] + seg[k][0] * f; cy = cl[k][1] + seg[k][1] * f; cz = cl[k][2] + seg[k][2] * f;
    return arc[k] + f * segL[k];
  };
  // lumière le long de la ligne centrale, par tranches de 2,5 mm (voir js/heart.js)
  const ptAt = (s) => { let k = 0; while (k < seg.length - 1 && arc[k + 1] < s) k++; return add(cl[k], mul(seg[k], Math.min(1, Math.max(0, (s - arc[k]) / segL[k])))); };
  const BIN = 0.25, nBin = Math.ceil(arc[arc.length - 1] / BIN) + 1;
  const latB = Array.from({ length: nBin }, (_, i) => norm(cross(norm(sub(ptAt(i * BIN + 0.3), ptAt(Math.max(0, i * BIN - 0.3)))), nObs)));
  const sides = [0, 1, 2].map(() => Array.from({ length: nBin }, () => []));
  for (let i = 0; i < nA; i++) {
    const px = artPos[3 * i], py = artPos[3 * i + 1], pz = artPos[3 * i + 2], s = nearest(px, py, pz), w = [px - cx, py - cy, pz - cz];
    if (len(w) > 2.2) continue;
    const bi = Math.min(nBin - 1, Math.round(s / BIN)), lat = dot(w, latB[bi]), fr = dot(w, nObs);
    if (Math.abs(fr) < 0.35) sides[lat > 0 ? 0 : 1][bi].push(Math.abs(lat));
    if (fr < 0 && Math.abs(lat) < 0.35) sides[2][bi].push(-fr);
  }
  const prof = sides.map((S) => S.map((b) => (b.length >= 3 ? b.sort((x, y) => x - y)[Math.floor(b.length * 0.4)] : NaN)));
  const okB = prof[0].map((v, i) => Number.isFinite(v) && Number.isFinite(prof[1][i])), b0 = okB.indexOf(true), b1 = okB.lastIndexOf(true);
  const rads = prof.map((r0) => {
    let r = r0.slice();
    const ok = r.map(Number.isFinite), first = ok.indexOf(true);
    for (let i = 0; i < nBin; i++) if (!ok[i]) { let j = i - 1; while (j >= 0 && !ok[j]) j--; r[i] = j >= 0 ? r[j] : r[first]; }
    for (let pass = 0; pass < 6; pass++) r = r.map((v, i) => (r[Math.max(0, i - 1)] + 2 * v + r[Math.min(nBin - 1, i + 1)]) / 4);
    return r;
  });
  const radAt = (s, m) => { const f = Math.min(nBin - 1, Math.max(0, s / BIN)), i = Math.min(nBin - 2, Math.floor(f)), r = rads[m]; return r[i] + (r[i + 1] - r[i]) * (f - i); };
  const sLo = b0 * BIN, sHi = b1 * BIN;
  const data = new Uint8Array(4 * N), byte = (f) => Math.max(0, Math.min(255, Math.round(128 + f * 254)));
  for (let z = 0, k = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++, k++) {
    const fA = Math.min(Math.min(dPA[k], dC[k]) - dA[k], 1.7 - dA[k]);
    const fP = Math.min(Math.min(dA[k], dC[k]) - dPA[k], 1.7 - dPA[k]);
    data[4 * k] = byte(fP);
    data[4 * k + 1] = byte(fA);
    if (fA < -0.5 && dA[k] > 0.8) continue;
    const px = lo[0] + (x + 0.5) * VS, py = lo[1] + (y + 0.5) * VS, pz = lo[2] + (z + 0.5) * VS;
    const s = nearest(px, py, pz), rc = Math.hypot(px - cx, py - cy, pz - cz);
    const fB = nObs[0] * (px - cx) + nObs[1] * (py - cy) + nObs[2] * (pz - cz);
    data[4 * k + 2] = byte(fB);
    data[4 * k + 3] = byte(Math.min(Math.max(radAt(s, 0), radAt(s, 1), radAt(s, 2)) + 0.6 - rc, s - sLo + 0.6, sHi + 0.6 - s));
    if (dA[k] < 0.8) data[4 * k] = byte(Math.min(fP, Math.max(dA[k] - 0.5, fB)));
  }
  // ruban posé sur la surface de l'ouverture (± 3,6 cm de part et d'autre de la ligne centrale)
  const L = arc[arc.length - 1], NS = Math.ceil(L / 0.2), NW = 24, rPos = [], rIdx = [];
  const frame = (s) => { const c = ptAt(s), t = norm(sub(ptAt(Math.min(L, s + 0.3)), ptAt(Math.max(0, s - 0.3)))); return [c, norm(cross(t, nObs))]; };
  for (let i = 0; i <= NS; i++) {
    const [c, bv] = frame((L * i) / NS);
    for (let j = 0; j <= NW; j++) {
      const q = add(c, mul(bv, 3.6 * ((2 * j) / NW - 1)));
      rPos.push(q[0], q[1], q[2]);
      if (i < NS && j < NW) { const a = i * (NW + 1) + j, b = a + NW + 1; rIdx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
  }
  // gouttière : demi-tube postérieur, aux demi-largeurs et à la profondeur de la lumière (+ 3 %), normales vers l'axe
  const NL = Math.ceil((sHi - sLo) / 0.12), NT = 32, lPos = [], lNrm = [], lIdx = [];
  for (let i = 0; i <= NL; i++) {
    const s = sLo + ((sHi - sLo) * i) / NL, rP = radAt(s, 0) * 1.03, rM = radAt(s, 1) * 1.03, rB = radAt(s, 2) * 1.03, [c, bv] = frame(s);
    for (let j = 0; j <= NT; j++) {
      const th = (Math.PI * j) / NT, x = Math.cos(th) * (Math.cos(th) > 0 ? rP : rM), y = Math.sin(th) * rB;
      const dir = add(mul(bv, x), mul(nObs, -y)), dn = norm(dir);
      lPos.push(c[0] + dir[0], c[1] + dir[1], c[2] + dir[2]); lNrm.push(-dn[0], -dn[1], -dn[2]);
      if (i < NL && j < NT) { const a = i * (NT + 1) + j, b = a + NT + 1; lIdx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
  }
  return {
    data, nx, ny, nz, lo, VS,
    ribbon: { pos: new Float32Array(rPos), idx: new Uint32Array(rIdx) },
    liner: { pos: new Float32Array(lPos), nrm: new Float32Array(lNrm), idx: new Uint32Array(lIdx) },
  };
}
