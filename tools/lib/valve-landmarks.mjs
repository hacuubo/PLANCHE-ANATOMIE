// Repères des valves tirés des maillages BodyParts3D, pour le modèle paramétrique des valves (js/valves.js) :
//   - valves auriculo-ventriculaires : plan et rayon de l'anneau (jonction réelle oreillette / ventricule), centre et
//     ellipse (bord d'attache réel des feuillets), secteur de chaque feuillet, tête de chaque muscle papillaire ;
//   - valves sigmoïdes : centre, axe et rayon de la racine, position angulaire de chaque cuspide.
// Les hauteurs des feuillets sont anatomiques (les maillages réduits mêlent feuillets et cordages), mises à l'échelle
// de l'anneau mesuré.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mean = (pts) => mul(pts.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / pts.length);
const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(q * (s.length - 1))]; };
const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function vertsOf(m) { const o = []; for (let i = 0; i < m.pos.length / 3; i++) o.push([m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]]); return o; }
// plus grande composante connexe (le feuillet lui-même, sans les débris de la réduction)
export function mainComponent(m) {
  const nv = m.pos.length / 3, parent = new Int32Array(nv).map((_, i) => i);
  const f = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  for (let t = 0; t < m.idx.length; t += 3) { const a = f(m.idx[t]), b = f(m.idx[t + 1]), c = f(m.idx[t + 2]); parent[b] = a; parent[f(c)] = a; }
  const count = new Map(); for (let i = 0; i < nv; i++) { const r = f(i); count.set(r, (count.get(r) || 0) + 1); }
  let best = -1, bn = 0; for (const [r, n] of count) if (n > bn) { bn = n; best = r; }
  const out = []; for (let i = 0; i < nv; i++) if (f(i) === best) out.push([m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]]);
  return out;
}
const angleOf = (p, c, e1, e2) => Math.atan2(dot(sub(p, c), e2), dot(sub(p, c), e1));
// moyenne circulaire d'angles
const circMean = (angs) => Math.atan2(angs.reduce((s, a) => s + Math.sin(a), 0), angs.reduce((s, a) => s + Math.cos(a), 0));
// secteurs jointifs à partir des angles centraux triés : frontières à mi-chemin (commissures)
function tile(centers) {
  const order = centers.map((c, i) => [wrap(c), i]).sort((a, b) => a[0] - b[0]);
  const n = order.length, out = new Array(n);
  for (let k = 0; k < n; k++) {
    const [c, i] = order[k], prev = order[(k + n - 1) % n][0], next = order[(k + 1) % n][0];
    const dPrev = wrap(c - prev) || TAU, dNext = wrap(next - c) || TAU;
    out[i] = [c - (dPrev < 0 ? dPrev + TAU : dPrev) / 2, c + (dNext < 0 ? dNext + TAU : dNext) / 2];
  }
  return out;
}

// Hauteurs anatomiques (cm, pour un anneau de rayon moyen 1,35 cm) et nombre de festons du bord libre
const AV_HEIGHT = {
  'Anterior leaflet of mitral valve': [2.1, 1], 'Posterior leaflet of mitral valve': [1.4, 3],
  'Anterior leaflet of tricuspid valve': [1.9, 1], 'Posterior leaflet of tricuspid valve': [1.5, 2], 'Septal leaflet of tricuspid valve': [1.4, 1],
};

// Valve auriculo-ventriculaire
//   leaflets : [{ name, pts }] (composante principale), papillaries : [{ name, pts }], ring : points de la jonction
//   oreillette / ventricule, axis : de l'oreillette vers le ventricule, mitral : vrai pour la mitrale
export function avModel({ leaflets, papillaries, ring, axis, mitral = false }) {
  axis = norm(axis);
  const ringC = mean(ring);
  const along = (p) => dot(sub(p, ringC), axis);
  // bord d'attache : points des feuillets proches du plan de l'anneau
  const top = leaflets.map((l) => ({ name: l.name, pts: l.pts.filter((p) => { const a = along(p); return a > -0.25 && a < 0.45; }) }));
  const allTop = top.flatMap((t) => t.pts);
  let center = mean(allTop);
  center = sub(center, mul(axis, along(center))); // ramené dans le plan de l'anneau
  // ellipse : analyse en composantes principales dans le plan
  let r1 = sub(allTop[0], center); r1 = norm(sub(r1, mul(axis, dot(r1, axis)))); const r2 = cross(axis, r1);
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of allTop) { const x = dot(sub(p, center), r1), y = dot(sub(p, center), r2); sxx += x * x; sxy += x * y; syy += y * y; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const e1 = norm(add(mul(r1, Math.cos(th)), mul(r2, Math.sin(th)))), e2 = cross(axis, e1);
  const ra = pct(allTop.map((p) => Math.abs(dot(sub(p, center), e1))), 0.8), rb = pct(allTop.map((p) => Math.abs(dot(sub(p, center), e2))), 0.8);
  // rayon moyen : médiane de la jonction réelle des cavités (la nappe des feuillets est un peu en retrait)
  const radial = (p) => { const q = sub(p, center); return len(sub(q, mul(axis, dot(q, axis)))); };
  const Rm = Math.max(pct(ring.map(radial), 0.5), (ra + rb) / 2);
  const k = Rm / ((ra + rb) / 2);
  const radii = [ra * k, rb * k];
  // secteurs : angle central réel de chaque feuillet, frontières aux commissures
  const centers = top.map((t) => circMean(t.pts.map((p) => angleOf(p, center, e1, e2))));
  let sectors = tile(centers);
  if (mitral) {
    // feuillet antérieur ≈ 130° de la circonférence, postérieur ≈ 230° (festons P1, P2, P3)
    const ia = top.findIndex((t) => /Anterior/.test(t.name)), ca = centers[ia];
    sectors = top.map((t, i) => (i === ia ? [ca - 1.13, ca + 1.13] : [ca + 1.13, ca + TAU - 1.13]));
  }
  const scale = Rm / 1.35;
  const outLeaflets = top.map((t, i) => ({ name: t.name, t0: sectors[i][0], t1: sectors[i][1], height: (AV_HEIGHT[t.name]?.[0] ?? 1.5) * scale, scallops: AV_HEIGHT[t.name]?.[1] ?? 1 }));
  const heads = papillaries.map((p) => {
    const head = p.pts.reduce((b, q) => (len(sub(q, center)) < len(sub(b, center)) ? q : b));
    return { name: p.name, head, angle: angleOf(head, center, e1, e2) };
  });
  return { type: 'av', center, axis, e1, e2, radii, saddle: mitral ? 0.18 * scale : 0.08 * scale, leaflets: outLeaflets, papillaries: heads };
}

// Valve sigmoïde : cusps = [{ name, pts }], axis = du ventricule vers l'artère
export function slModel({ cusps, axis }) {
  axis = norm(axis);
  const all = cusps.flatMap((c) => c.pts);
  let center = mean(all);
  let r1 = sub(all[0], center); r1 = norm(sub(r1, mul(axis, dot(r1, axis)))); const e1 = r1, e2 = cross(axis, e1);
  const radial = (p) => { const q = sub(p, center); return len(sub(q, mul(axis, dot(q, axis)))); };
  const radius = pct(all.map(radial), 0.9);
  const al = all.map((p) => dot(sub(p, center), axis));
  center = add(center, mul(axis, pct(al, 0.1))); // base des cuspides (point le plus ventriculaire de l'attache)
  const height = Math.min(1.45, Math.max(0.9, 0.78 * radius));
  const centers = cusps.map((c) => circMean(c.pts.map((p) => angleOf(p, center, e1, e2))));
  const sectors = tile(centers);
  return { type: 'sl', center, axis, e1, e2, radius, height, cusps: cusps.map((c, i) => ({ name: c.name, t0: sectors[i][0], t1: sectors[i][1] })) };
}
