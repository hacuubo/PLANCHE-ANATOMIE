// Forme organique du cœur décrite par une fonction de distance signée (SDF) — unités en centimètres.
// Repère monde : +x = gauche du patient, +y = haut, +z = avant (vers l'observateur en vue antérieure).
// La masse ventriculaire est décrite dans un repère local incliné (axe base → apex), les grands vaisseaux dans le
// repère monde. Les positions reprennent celles du modèle relu en anatomie (docs/relectures/).
//
// Module sans dépendance, partagé par :
//   - tools/build-heart-mesh.mjs : génère hors ligne le maillage continu (assets/heart.bin) par « surface nets » ;
//   - js/heart.js : repère local, points de surface, trajets des coronaires et du sang.
// Toute modification de forme impose de régénérer le maillage : `node tools/build-heart-mesh.mjs`.

/* ─────────── vecteurs (tableaux [x, y, z]) ─────────── */
export const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vscale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vlen = (a) => Math.sqrt(vdot(a, a));
export const vnorm = (a) => vscale(a, 1 / (vlen(a) || 1));
export const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vlerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/* ─────────── repère local du cœur ─────────── */
export const BASE = [-0.3, 1.2, -0.6];   // centre de la base ventriculaire
export const APEX = [3.4, -5.2, 1.8];    // pointe du cœur
export const L = vlen(vsub(APEX, BASE));
export const AXIS = vnorm(vsub(APEX, BASE));
export const U = vnorm(vsub([0, 0, 1], vscale(AXIS, AXIS[2])));  // « avant » local
export const V = vnorm(vcross(U, AXIS));                           // « gauche » local
export const Z_SCALE = 0.8; // aplatissement antéro-postérieur de la masse ventriculaire
// Base du repère local : x = V, y = −AXIS, z = U (orthonormée directe), origine BASE.
export function l2w(p) {
  return [
    BASE[0] + V[0] * p[0] - AXIS[0] * p[1] + U[0] * p[2],
    BASE[1] + V[1] * p[0] - AXIS[1] * p[1] + U[1] * p[2],
    BASE[2] + V[2] * p[0] - AXIS[2] * p[1] + U[2] * p[2],
  ];
}
export function w2l(p) { const d = vsub(p, BASE); return [vdot(d, V), -vdot(d, AXIS), vdot(d, U)]; }

// Profil de rayon de la masse ventriculaire (t = 0 base → 1 apex), interpolation Catmull-Rom.
const PROFIL = [3.6, 4.0, 4.15, 4.1, 3.9, 3.6, 3.15, 2.6, 1.95, 1.1, 0.0];
export function rOf(t) {
  t = clamp(t, 0, 1);
  const n = PROFIL.length - 1;
  const x = t * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  const p0 = PROFIL[Math.max(i - 1, 0)], p1 = PROFIL[i], p2 = PROFIL[i + 1], p3 = PROFIL[Math.min(i + 2, n)];
  return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}
const dRof = (t) => (rOf(Math.min(1, t + 0.002)) - rOf(Math.max(0, t - 0.002))) / (Math.min(1, t + 0.002) - Math.max(0, t - 0.002));
// Point sur la surface ventriculaire (repère local). theta : 0 = avant, +90° = gauche. off : décalage radial (cm).
export function surf(t, thetaDeg, off = 0) {
  const th = thetaDeg * Math.PI / 180;
  const r = rOf(t) + off;
  return [r * Math.sin(th), -L * t, r * Math.cos(th) * Z_SCALE];
}
// Région ventriculaire d'un point de la masse (repère local) : VD, VG ou apex (même règle pour la couleur,
// la surbrillance et le clic). VD : entre les sillons interventriculaires postérieur (−167° → −158°) et antérieur (+24° → +14°).
export function ventricleRegion(pl) {
  const t = -pl[1] / L;
  if (t > 0.93) return 'apex';
  const th = Math.atan2(pl[0], pl[2] / Z_SCALE) * 180 / Math.PI;
  return (th > -167 + 9 * t && th < 24 - 10 * t) ? 'ventricule-droit' : 'ventricule-gauche';
}

/* ─────────── courbes (Catmull-Rom centripète, identique à THREE.CatmullRomCurve3) ─────────── */
function cubicCoeffs(x0, x1, x2, x3, dt0, dt1, dt2) {
  let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
  let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;
  t1 *= dt1; t2 *= dt1;
  return [x1, t1, -3 * x1 + 3 * x2 - 2 * t1 - t2, 2 * x1 - 2 * x2 + t1 + t2];
}
export function curvePoint(points, u) {
  const l = points.length;
  const p = (l - 1) * u;
  let i = Math.floor(p), w = p - i;
  if (i >= l - 1) { i = l - 2; w = 1; }
  const p1 = points[i], p2 = points[i + 1];
  const p0 = i > 0 ? points[i - 1] : vadd(vsub(p1, p2), p1);
  const p3 = i + 2 < l ? points[i + 2] : vadd(vsub(p2, p1), p2);
  const d2 = (a, b) => vdot(vsub(a, b), vsub(a, b));
  let dt0 = Math.pow(d2(p0, p1), 0.25), dt1 = Math.pow(d2(p1, p2), 0.25), dt2 = Math.pow(d2(p2, p3), 0.25);
  if (dt1 < 1e-4) dt1 = 1; if (dt0 < 1e-4) dt0 = dt1; if (dt2 < 1e-4) dt2 = dt1;
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const c = cubicCoeffs(p0[k], p1[k], p2[k], p3[k], dt0, dt1, dt2);
    out[k] = c[0] + c[1] * w + c[2] * w * w + c[3] * w * w * w;
  }
  return out;
}
// Échantillonne la courbe à pas d'abscisse curviligne ≈ constant ; t = fraction de longueur (comme getPointAt).
export function sampleCurve(points, step = 0.25) {
  if (points.length === 2) points = [points[0], vlerp(points[0], points[1], 0.5), points[1]];
  const N = 240, dense = [], acc = [0];
  for (let i = 0; i <= N; i++) dense.push(curvePoint(points, i / N));
  for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + vlen(vsub(dense[i], dense[i - 1])));
  const total = acc[N];
  const n = Math.max(2, Math.ceil(total / step));
  const out = [];
  let j = 0;
  for (let s = 0; s <= n; s++) {
    const target = (s / n) * total;
    while (j < N - 1 && acc[j + 1] < target) j++;
    const f = (target - acc[j]) / Math.max(1e-9, acc[j + 1] - acc[j]);
    out.push({ p: vlerp(dense[j], dense[j + 1], clamp(f, 0, 1)), t: s / n });
  }
  return out;
}

/* ─────────── bruit (valeur 3D, déterministe) ─────────── */
function hash3(i, j, k) {
  let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(k, 0x6c8e9cf5);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const fx = x - i, fy = y - j, fz = z - k;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const a = hash3(i, j, k), b = hash3(i + 1, j, k), c = hash3(i, j + 1, k), d = hash3(i + 1, j + 1, k);
  const e = hash3(i, j, k + 1), f = hash3(i + 1, j, k + 1), g = hash3(i, j + 1, k + 1), h = hash3(i + 1, j + 1, k + 1);
  const x00 = a + (b - a) * u, x10 = c + (d - c) * u, x01 = e + (f - e) * u, x11 = g + (h - g) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}
export function fbm(x, y, z, oct = 3) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += a * vnoise(x * f + o * 17.1, y * f + o * 31.7, z * f + o * 7.3); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
// union lisse polynomiale (raccord arrondi de largeur k)
export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/* ─────────── tissus et couleurs (sRGB 0–1) ─────────── */
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
// Teintes d'animation médicale (style Nucleus) : muscle rose pêche translucide, oreillettes un peu plus soutenues,
// graisse crème pâle, gros vaisseaux ivoire nacré à peine teintés (chaud = sang riche, froid = sang pauvre en oxygène).
export const TEINTES = {
  ventricule: hex(0xe2a09e),
  oreillette: hex(0xc98479),
  graisse: hex(0xf0d8c0),
  artere: hex(0xf3dac6),
  arterePulm: hex(0xd5daf0),
  veine: hex(0xd5daf0),
  veinePulm: hex(0xf1dccb),
  ligament: hex(0xefe6d6),
  lumenArtere: hex(0xa8605e),
  lumenVeine: hex(0x8a7f9e),
};
// tissu → poids [graisse, vaisseau, oreillette] pour le shader (muscle ventriculaire = reste)
const TISSU = { muscle: [0, 0, 0], oreillette: [0, 0, 1], graisse: [1, 0, 0], vaisseau: [0, 1, 0], ligament: [0, 1, 0] };

/* ─────────── primitives ─────────── */
const comps = [];      // toutes les composantes (pour l'attribution des sommets)
function finishBox(c, ptsWorld, pad, register = true) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of ptsWorld) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
  c.bmin = mn.map((v) => v - pad); c.bmax = mx.map((v) => v + pad);
  if (register) comps.push(c);
  return c;
}
const BLEND_PAD = 1.2; // marge des boîtes englobantes : largeur de raccord maximale + bruit
const inBox = (c, x, y, z) => x >= c.bmin[0] && x <= c.bmax[0] && y >= c.bmin[1] && y <= c.bmax[1] && z >= c.bmin[2] && z <= c.bmax[2];

// Ellipsoïde (approximation de distance d'Inigo Quilez), rotation optionnelle autour de y, bruit de surface.
function ellipsoid(o) {
  const { center, radii, rotY = 0, local = true, noise = 0, freq = 2 } = o;
  const cs = Math.cos(rotY), sn = Math.sin(rotY);
  const c = { ...o, local, d(p) {
    let x = p[0] - center[0], y = p[1] - center[1], z = p[2] - center[2];
    const xr = cs * x - sn * z, zr = sn * x + cs * z; x = xr; z = zr;
    const k0 = Math.sqrt((x / radii[0]) ** 2 + (y / radii[1]) ** 2 + (z / radii[2]) ** 2);
    const k1 = Math.sqrt((x / (radii[0] * radii[0])) ** 2 + (y / (radii[1] * radii[1])) ** 2 + (z / (radii[2] * radii[2])) ** 2);
    let d = k0 * (k0 - 1) / k1;
    if (noise) d += noise * (fbm(p[0] * freq, p[1] * freq, p[2] * freq, 2) - 0.5) * 2;
    return d;
  } };
  const R = Math.max(...radii);
  const corners = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const q = [center[0] + sx * R, center[1] + sy * R, center[2] + sz * R];
    corners.push(local ? l2w(q) : q);
  }
  return finishBox(c, corners, BLEND_PAD + noise);
}

// Chaîne de cônes arrondis le long d'une courbe ; extrémités « sectionnées » (coupe plane et lumière creuse).
function chain(o) {
  const { points, r, local = false, cut0 = false, cut1 = false, hollow = true, noise = 0, freq = 2, billow = 0, billowFreq = 2.4 } = o;
  const rFn = typeof r === 'function' ? r : () => r;
  const S = sampleCurve(points, 0.22);
  const segs = [];
  let rMax = 0;
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[i].p, b = S[i + 1].p, ra = rFn(S[i].t), rb = rFn(S[i + 1].t);
    const ba = vsub(b, a), l2 = vdot(ba, ba), mid = vlerp(a, b, 0.5);
    rMax = Math.max(rMax, ra, rb);
    segs.push({ ax: a[0], ay: a[1], az: a[2], bx: ba[0], by: ba[1], bz: ba[2], l2: Math.max(l2, 1e-9), ra, rb, cx: mid[0], cy: mid[1], cz: mid[2], R: Math.sqrt(l2) / 2 + Math.max(ra, rb) });
  }
  const ends = [];
  // lumière creuse seulement pour les gros vaisseaux (une paroi trop fine pour la grille donnerait des artefacts)
  const mkEnd = (P, T, rr) => ({ P, T, rIn: rr - Math.max(0.11, 0.16 * rr), depth: Math.min(1.0, 1.5 * rr), open: rr >= 0.7 });
  const n = S.length;
  if (cut0) ends.push(mkEnd(S[0].p, vnorm(vsub(S[0].p, S[1].p)), rFn(0)));
  if (cut1) ends.push(mkEnd(S[n - 1].p, vnorm(vsub(S[n - 1].p, S[n - 2].p)), rFn(1)));
  const base = (x, y, z) => {
    let best = 1e9;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const dx = x - s.cx, dy = y - s.cy, dz = z - s.cz;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) - s.R > best) continue;
      const px = x - s.ax, py = y - s.ay, pz = z - s.az;
      let h = (px * s.bx + py * s.by + pz * s.bz) / s.l2; h = h < 0 ? 0 : h > 1 ? 1 : h;
      const qx = px - s.bx * h, qy = py - s.by * h, qz = pz - s.bz * h;
      const d = Math.sqrt(qx * qx + qy * qy + qz * qz) - (s.ra + (s.rb - s.ra) * h);
      if (d < best) best = d;
    }
    return best;
  };
  const hole = (x, y, z) => {
    let hm = 1e9;
    for (const e of ends) {
      if (!e.open) continue;
      const qx = x - e.P[0], qy = y - e.P[1], qz = z - e.P[2];
      const al = qx * e.T[0] + qy * e.T[1] + qz * e.T[2];
      const rx = qx - e.T[0] * al, ry = qy - e.T[1] * al, rz = qz - e.T[2] * al;
      hm = Math.min(hm, Math.max(Math.sqrt(rx * rx + ry * ry + rz * rz) - e.rIn, -al - e.depth));
    }
    return hm;
  };
  const c = { ...o, local, ends, d(p) {
    const [x, y, z] = p;
    let v = base(x, y, z);
    if (v > 1.5) return v;
    if (noise) v += noise * (fbm(x * freq, y * freq, z * freq, 2) - 0.5) * 2;
    if (billow) v -= billow * (1 - Math.abs(2 * fbm(x * billowFreq, y * billowFreq, z * billowFreq, 2) - 1)) - billow * 0.45;
    for (const e of ends) { const al = (x - e.P[0]) * e.T[0] + (y - e.P[1]) * e.T[1] + (z - e.P[2]) * e.T[2]; if (al > v) v = al; }
    if (hollow && ends.length) { const hs = -hole(x, y, z); if (hs > v) v = hs; }
    return v;
  }, inLumen(p) { return hollow && ends.length > 0 && hole(p[0], p[1], p[2]) < 0.05; } };
  const world = S.map((s) => (local ? l2w(s.p) : s.p));
  return finishBox(c, world, rMax + BLEND_PAD + noise + billow, o.register !== false);
}

// Masse ventriculaire : surface de révolution du profil (aplatie d'avant en arrière), dôme basal, bruit discret.
function ventricularMass(o) {
  const r0 = PROFIL[0];
  const c = { ...o, local: true, d(p) {
    const [x, y, z] = p;
    const rho = Math.sqrt(x * x + (z / Z_SCALE) ** 2);
    let d;
    const t = -y / L;
    if (t <= 0) d = rho - r0; // prolongement cylindrique au-dessus de la base…
    else if (t >= 1) d = Math.sqrt(rho * rho + (y + L) ** 2);
    else { const dr = dRof(t) / L; d = (rho - rOf(t)) / Math.sqrt(1 + dr * dr); }
    d = -smin(-d, -(y - 0.3), 0.9); // …coiffé par le plan basal avec un arrondi continu (pas de couture)
    return d + 0.03 * (fbm(x * 1.3, y * 1.3, z * 1.3, 2) - 0.5) * 2;
  } };
  const corners = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const yy of [0.5, -L - 0.2]) corners.push(l2w([sx * 4.5, yy, sz * 4.0]));
  return finishBox(c, corners, BLEND_PAD);
}

/* ─────────── description anatomique ─────────── */
// Points remarquables (repère local)
export const RA_C = [-2.5, 1.95, -0.4];
export const LA_C = [0.55, 2.05, -2.7];
export const PT_ROOT_L = [1.45, 1.9, 2.15];     // racine du tronc pulmonaire, au sommet du cône artériel
export const AO_ROOT_L = [-0.25, 1.75, 0.55];
export const RA_W = l2w(RA_C), LA_W = l2w(LA_C);
// Cavités (repère local), ajustées à l'enveloppe par tools/check-walls.mjs : paroi VG 0,8–1,35 cm, paroi libre du VD
// 0,3–0,7 cm, septum 0,9–1,4 cm. VD = ellipsoïde plié en croissant autour du VG (voir bentEllipsoid dans heart.js).
export const CAVITES = {
  VG: { centre: [0.85, -2.53, -0.39], rayons: [2.0, 2.68, 1.72] },
  VD: { pos: [-0.02, -2.02, -0.35], ax: 2.75, ay: 2.18, az: 0.79, R: 2.81, phiC: -1.15 },
  OD: { centre: RA_C, rayons: [1.95, 2.2, 1.85] },
  OG: { centre: LA_C, rayons: [2.42, 1.82, 1.62] },
  // chambres de chasse : VG → valve aortique, infundibulum du VD → valve pulmonaire
  chasseVG: { pts: [[0.5, -1.0, -0.1], [0.0, 0.0, 0.35], [-0.25, 1.1, 0.55]], r: 0.6 },
  infundibulum: { pts: [[-0.9, -1.4, 1.5], [0.6, 0.2, 1.7], [1.45, 1.5, 2.15]], r: 0.6 },
};
export const AO_ROOT = l2w(AO_ROOT_L), PT_ROOT = l2w(PT_ROOT_L);
export const BIF = [1.6, 7.5, -1.4];             // bifurcation du tronc pulmonaire
export const PT_MID = [1.3, 6.0, 0.7];
export const AORTE_PTS = [
  AO_ROOT, l2w([-0.3, 2.6, 0.5]),
  [-1.7, 5.0, -0.45], [-1.3, 7.3, -0.8],
  [0.0, 9.8, -1.2], [1.3, 10.3, -2.2], [2.5, 9.7, -3.8],
  [3.3, 7.6, -4.6], [3.5, 4.0, -5.2], [3.3, 0.0, -5.6], [3.0, -4.0, -5.9], [2.8, -8.0, -6.1],
];
export const aorteRadius = (t) => {
  if (t < 0.05) return 1.55 + 0.25 * Math.sin(t / 0.05 * Math.PI); // sinus de Valsalva
  if (t < 0.35) return 1.5 - 0.1 * (t - 0.05) / 0.3;
  if (t < 0.55) return 1.4 - 0.2 * (t - 0.35) / 0.2;
  return 1.2 - 0.1 * (t - 0.55) / 0.45;
};
export const PT_PTS = [PT_ROOT, vadd(PT_ROOT, [0.3, 1.2, -0.1]), PT_MID, [1.5, 7.2, -0.6], BIF];
export const APD_PTS = [BIF, [-0.4, 7.3, -2.4], [-2.6, 7.1, -3.2], [-5.2, 6.8, -3.6]];
export const APG_PTS = [BIF, [2.4, 7.4, -2.0], [4.3, 7.4, -2.9], [5.6, 7.0, -3.4]];
export const VCS_PTS = [[-3.8, 12.0, -1.6], [-3.8, 9.5, -1.6], [-3.7, 6.5, -1.6], vadd(RA_W, [0.1, 1.6, 0.0])];
export const VCI_PTS = [vadd(RA_W, [0.2, -1.6, -0.5]), [-3.1, -1.6, -2.3], [-2.9, -4.3, -2.7], [-2.7, -6.5, -2.9]];
// veines pulmonaires : [départ (dans l'OG), extrémité sectionnée] en décalage depuis le centre de l'OG
export const VP = [
  [[-1.4, 0.9, -0.9], [-4.6, 1.3, -1.2]],   // supérieure droite
  [[-1.4, -0.7, -1.0], [-4.6, -1.1, -1.3]], // inférieure droite
  [[1.6, 0.9, -0.9], [4.4, 1.5, -1.2]],     // supérieure gauche
  [[1.6, -0.6, -1.0], [4.4, -0.9, -1.4]],   // inférieure gauche
].map(([d, e]) => [vadd(LA_W, d), vadd(LA_W, [e[0] * 0.6, e[1], e[2]]), vadd(LA_W, e)]);
export const AUR_G_PTS = [[2.6, 2.0, -1.2], [3.6, 1.9, 0.3], [3.8, 1.6, 1.7], [3.0, 1.3, 2.7]]; // local : déborde à gauche du tronc pulmonaire

// Noyau : masse ventriculaire, cône artériel, oreillettes, auricules, graisse des sillons (raccords lisses entre eux)
const core = [];
const addCore = (c, k) => { c.k = k; core.push(c); return c; };
addCore(ventricularMass({ id: 'ventricules', tissue: 'muscle', color: TEINTES.ventricule, anchor: null }), 0);
// Cône artériel (infundibulum) : du milieu de la face antérieure du VD jusqu'à la racine du tronc pulmonaire
addCore(chain({ id: 'ventricule-droit', tissue: 'muscle', color: TEINTES.ventricule, local: true, hollow: false,
  points: [surf(0.32, 12, -1.35), surf(0.12, 22, -1.0), vlerp(PT_ROOT_L, surf(0.12, 22, -1.0), 0.3)], r: (t) => 1.55 - 0.15 * t, noise: 0.02 }), 0.9);
addCore(ellipsoid({ id: 'oreillette-droite', tissue: 'oreillette', color: TEINTES.oreillette, center: RA_C, radii: [2.2, 2.45, 2.1], noise: 0.025, freq: 1.4,
  anchor: l2w([-4.6, 2.8, 0.4]) }), 0.7);
addCore(ellipsoid({ id: 'oreillette-gauche', tissue: 'oreillette', color: TEINTES.oreillette, center: LA_C, radii: [2.7, 2.1, 1.9], noise: 0.025, freq: 1.4,
  anchor: l2w([1.2, 3.2, -4.7]) }), 0.7);
addCore(ellipsoid({ id: 'auricule-droite', tissue: 'oreillette', color: TEINTES.oreillette, center: [-1.55, 1.9, 1.55], radii: [1.4, 0.95, 1.25], rotY: -0.4, noise: 0.1, freq: 2.6,
  anchor: l2w([-1.9, 2.4, 3.0]) }), 0.45);
addCore(chain({ id: 'auricule-gauche', tissue: 'oreillette', color: TEINTES.oreillette, local: true, hollow: false, points: AUR_G_PTS,
  r: (t) => 1.0 - 0.4 * t, noise: 0.11, freq: 2.8, anchor: l2w(curvePoint(AUR_G_PTS, 0.7)) }), 0.25);
// Graisse épicardique : coussinets lobulés dans les sillons (coronaire, interventriculaires) et à la racine des gros vaisseaux
const coroD = [], coroG = [];
for (let th = -20; th >= -180; th -= 12) coroD.push(surf(0.01, th, -0.12));
for (let th = 35; th <= 180; th += 12) coroG.push(surf(0.01, th, -0.12));
export const GRAISSE = []; // [{ pts (local), r }] : solides de coupe « graisse »
const fat = (pts, r, anchor) => GRAISSE.push({ pts, r: typeof r === 'function' ? r : () => r }) && addCore(chain({ id: 'sillons', tissue: 'graisse', color: TEINTES.graisse, local: true, hollow: false, points: pts, r, billow: 0.04, billowFreq: 2.6, anchor }), 0.45);
fat(coroD, 0.42, l2w(curvePoint(coroD, 0.3)));
fat(coroG, 0.4);
fat([[0.0, 24], [0.2, 22], [0.4, 20], [0.6, 18], [0.8, 15], [0.95, 12]].map(([t, th]) => surf(t, th, -0.18)), (t) => 0.38 - 0.16 * t);
fat([[0.0, -168], [0.2, -166], [0.4, -164], [0.6, -162], [0.8, -160], [0.93, -158]].map(([t, th]) => surf(t, th, -0.18)), (t) => 0.38 - 0.16 * t);
addCore(ellipsoid({ id: 'sillons', tissue: 'graisse', color: TEINTES.graisse, center: [-1.15, 1.05, 2.15], radii: [0.66, 0.35, 0.5], noise: 0.05, freq: 2.8 }), 0.4);
addCore(ellipsoid({ id: 'sillons', tissue: 'graisse', color: TEINTES.graisse, center: [2.1, 0.9, 1.25], radii: [0.5, 0.3, 0.45], noise: 0.05, freq: 2.8 }), 0.4);

// Assemblages vasculaires : raccordés au noyau (k), mais pas entre assemblages voisins (aorte / tronc pulmonaire / VCS restent distincts)
const assemblies = [];
const assembly = (k, list) => {
  const A = { k, comps: list };
  A.bmin = [0, 1, 2].map((i) => Math.min(...list.map((c) => c.bmin[i])));
  A.bmax = [0, 1, 2].map((i) => Math.max(...list.map((c) => c.bmax[i])));
  assemblies.push(A);
  return A;
};
const vessel = (o, k = 0) => { const c = chain({ tissue: 'vaisseau', ...o }); c.k = k; return c; };
const at = (pts, t) => curvePoint(pts, t);
const BCT1 = [[0.15, 9.8, -1.25], [-0.4, 11.3, -1.0], [-1.2, 12.4, -0.85]];
const CCD = [[-1.2, 12.4, -0.85], [-1.5, 13.5, -0.7], [-1.7, 14.7, -0.6]];
const SCD = [[-1.2, 12.4, -0.85], [-2.6, 13.2, -0.95], [-4.6, 13.5, -1.1]];
const CCG = [[1.25, 10.3, -2.2], [1.2, 12.4, -2.0], [1.1, 14.7, -1.9]];
const SCG = [[2.15, 10.05, -2.95], [2.9, 11.9, -3.1], [4.8, 13.0, -3.3]];
assembly(0.6, [
  vessel({ id: 'aorte', color: TEINTES.artere, lumen: TEINTES.lumenArtere, points: AORTE_PTS, r: aorteRadius, cut1: true, anchor: [-1.7, 5.6, 0.95] }),
  vessel({ id: 'tronc-brachio-cephalique', color: TEINTES.artere, lumen: TEINTES.lumenArtere, points: BCT1, r: 0.62, anchor: at(BCT1, 0.6) }, 0.4),
  vessel({ id: 'tronc-brachio-cephalique', color: TEINTES.artere, lumen: TEINTES.lumenArtere, points: CCD, r: 0.45, cut1: true }, 0.3),
  vessel({ id: 'tronc-brachio-cephalique', color: TEINTES.artere, lumen: TEINTES.lumenArtere, points: SCD, r: 0.45, cut1: true }, 0.3),
  vessel({ id: 'carotide-commune-gauche', color: TEINTES.artere, lumen: TEINTES.lumenArtere, points: CCG, r: 0.46, cut1: true, anchor: at(CCG, 0.7) }, 0.4),
  vessel({ id: 'subclaviere-gauche', color: TEINTES.artere, lumen: TEINTES.lumenArtere, points: SCG, r: 0.46, cut1: true, anchor: at(SCG, 0.7) }, 0.4),
  vessel({ id: 'ligament-arteriel', tissue: 'ligament', color: TEINTES.ligament, points: [[2.4, 8.3, -2.05], [2.35, 8.85, -2.9]], r: 0.2, hollow: false, anchor: [2.38, 8.55, -2.45] }, 0.18),
]);
assembly(0.4, [
  vessel({ id: 'tronc-pulmonaire', color: TEINTES.arterePulm, lumen: TEINTES.lumenVeine, points: PT_PTS, r: (t) => (t < 0.06 ? 1.55 : 1.45 - 0.1 * t), anchor: at(PT_PTS, 0.45) }),
  vessel({ id: 'artere-pulmonaire-droite', color: TEINTES.arterePulm, lumen: TEINTES.lumenVeine, points: APD_PTS, r: (t) => 1.1 - 0.15 * t, cut1: true, anchor: at(APD_PTS, 0.75) }, 0.45),
  vessel({ id: 'artere-pulmonaire-gauche', color: TEINTES.arterePulm, lumen: TEINTES.lumenVeine, points: APG_PTS, r: (t) => 1.05 - 0.15 * t, cut1: true, anchor: at(APG_PTS, 0.7) }, 0.45),
]);
assembly(0.6, [vessel({ id: 'veine-cave-superieure', color: TEINTES.veine, lumen: TEINTES.lumenVeine, points: VCS_PTS, r: (t) => 1.0 + 0.1 * t, cut0: true, anchor: at(VCS_PTS, 0.4) })]);
assembly(0.6, [vessel({ id: 'veine-cave-inferieure', color: TEINTES.veine, lumen: TEINTES.lumenVeine, points: VCI_PTS, r: (t) => 1.1 + 0.1 * t, cut1: true, anchor: at(VCI_PTS, 0.6) })]);
VP.forEach((pts, i) => assembly(0.5, [vessel({ id: 'veines-pulmonaires', color: TEINTES.veinePulm, lumen: TEINTES.lumenArtere, points: pts, r: 0.55, cut1: true, anchor: i === 0 ? at(pts, 0.8) : undefined })]));

// Lumière des vaisseaux (pour la couleur du sang dans les coupes) : axe, rayon de la paroi, type de sang.
export const LUMIERES = [
  { pts: AORTE_PTS, r: aorteRadius, type: 'artere' }, { pts: BCT1, r: () => 0.62, type: 'artere' },
  { pts: CCD, r: () => 0.45, type: 'artere' }, { pts: SCD, r: () => 0.45, type: 'artere' },
  { pts: CCG, r: () => 0.46, type: 'artere' }, { pts: SCG, r: () => 0.46, type: 'artere' },
  { pts: PT_PTS, r: (t) => 1.45 - 0.1 * t, type: 'veine' }, { pts: APD_PTS, r: (t) => 1.1 - 0.15 * t, type: 'veine' },
  { pts: APG_PTS, r: (t) => 1.05 - 0.15 * t, type: 'veine' }, { pts: VCS_PTS, r: (t) => 1.0 + 0.1 * t, type: 'veine' },
  { pts: VCI_PTS, r: (t) => 1.1 + 0.1 * t, type: 'veine' }, ...VP.map((pts) => ({ pts, r: () => 0.55, type: 'artere' })),
];

// Identifiants des structures portées par l'enveloppe (indice = attribut « sid » du maillage)
export const ENVELOPPE_IDS = ['ventricule-droit', 'ventricule-gauche', 'apex', 'oreillette-droite', 'auricule-droite', 'oreillette-gauche', 'auricule-gauche',
  'sillons', 'aorte', 'tronc-brachio-cephalique', 'carotide-commune-gauche', 'subclaviere-gauche', 'tronc-pulmonaire', 'artere-pulmonaire-droite',
  'artere-pulmonaire-gauche', 'ligament-arteriel', 'veine-cave-superieure', 'veine-cave-inferieure', 'veines-pulmonaires'];
// Points d'ancrage approximatifs des étiquettes (monde) ; heart.js les plaque sur la surface générée.
export const ANCRES = {
  'ventricule-droit': l2w(surf(0.42, -45, 0)), 'ventricule-gauche': l2w(surf(0.5, 75, 0)), apex: l2w(surf(0.985, 20, 0)),
};
for (const c of comps) if (c.anchor && !ANCRES[c.id]) ANCRES[c.id] = c.anchor;

/* ─────────── champ de distance ─────────── */
function evalComp(c, pw, pl) { return c.d(c.local ? pl : pw); }
// Distance signée de l'enveloppe au point (x, y, z) monde (négatif à l'intérieur).
export function field(x, y, z) {
  const pw = [x, y, z];
  let pl = null;
  let coreD = 1e9;
  for (const c of core) {
    if (!inBox(c, x, y, z)) continue;
    if (c.local && !pl) pl = w2l(pw);
    const d = evalComp(c, pw, pl);
    coreD = c.k ? smin(coreD, d, c.k) : Math.min(coreD, d);
  }
  let f = coreD;
  for (const A of assemblies) {
    if (!inBox(A, x, y, z)) continue;
    let a = 1e9;
    for (const c of A.comps) {
      if (!inBox(c, x, y, z)) continue;
      const d = evalComp(c, pw, pl);
      a = c.k ? smin(a, d, c.k) : Math.min(a, d);
    }
    if (a < 1e8) f = Math.min(f, smin(a, coreD, A.k));
  }
  return f;
}
// Boîte englobante de l'enveloppe (monde)
export function bounds() {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const c of comps) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], c.bmin[k] + BLEND_PAD - 0.6); mx[k] = Math.max(mx[k], c.bmax[k] - BLEND_PAD + 0.6); }
  return { min: mn, max: mx };
}
// Attributs d'un point de surface : structure (indice dans ENVELOPPE_IDS), couleur sRGB, poids de tissu.
export function attributes(x, y, z) {
  const pw = [x, y, z], pl = w2l(pw);
  const ds = [];
  let dmin = 1e9, best = null;
  for (const c of comps) {
    if (!inBox(c, x, y, z)) continue;
    const d = evalComp(c, pw, pl);
    ds.push([c, d]);
    if (d < dmin) { dmin = d; best = c; }
  }
  const col = [0, 0, 0], tis = [0, 0, 0];
  let wsum = 0;
  for (const [c, d] of ds) {
    const w = Math.exp(-(d - dmin) / 0.09);
    if (w < 1e-3) continue;
    const lum = c.lumen && c.inLumen(c.local ? pl : pw);
    const cc = lum ? c.lumen : c.color, tt = TISSU[c.tissue];
    for (let k = 0; k < 3; k++) { col[k] += w * cc[k]; tis[k] += w * tt[k]; }
    wsum += w;
  }
  for (let k = 0; k < 3; k++) { col[k] /= wsum; tis[k] /= wsum; }
  // marbrure discrète (plages de ±6 %), plus marquée sur le muscle
  const m = 0.94 + 0.12 * fbm(x * 0.7 + 3.1, y * 0.7, z * 0.7, 2);
  for (let k = 0; k < 3; k++) col[k] = clamp(col[k] * m, 0, 1);
  let id = best.id;
  if (id === 'ventricules') id = ventricleRegion(pl);
  return { sid: ENVELOPPE_IDS.indexOf(id), color: col, tis };
}

/* ─────────── coronaires et veines du cœur (tubes séparés, repère local) ─────────── */
// Les artères sont enchâssées dans la graisse des sillons ; les petites branches courent à fleur de muscle.
const AO_L = AO_ROOT_L;
const taper = (r0, r1) => (t) => r0 + (r1 - r0) * t;
const twigs = (id, path, side, list, r0 = 0.05) => list.map(([t, th], k) => ({
  id, kind: 'artere', r: taper(r0, 0.022), pts: [surf(t, th, 0.02), surf(t + 0.05, th + side * 7, 0.02), surf(t + 0.11, th + side * (11 + (k % 3) * 2), 0.0), surf(t + 0.17, th + side * (13 + (k % 2) * 4), -0.04)],
}));
const GUIDES = [
  { id: 'tronc-commun', kind: 'artere', r: 0.26, sink: false, pts: [vadd(AO_L, [0.95, -0.35, -0.15]), [1.55, 0.95, 0.55], [2.25, 0.45, 1.15], surf(0.02, 38, 0.38)], anchorT: 0.5 },
  { id: 'iva', kind: 'artere', r: taper(0.23, 0.08), pts: [surf(0.02, 38, 0.38), surf(0.1, 28, 0.3), surf(0.25, 23, 0.25), surf(0.45, 20, 0.21), surf(0.65, 18, 0.17), surf(0.85, 15, 0.12), surf(0.97, 12, 0.08), surf(1.0, 5, 0.04)], anchorT: 0.45 },
  { id: 'iva', kind: 'artere', r: taper(0.13, 0.04), pts: [surf(0.2, 24, 0.12), surf(0.35, 42, 0.06), surf(0.55, 58, 0.04), surf(0.72, 66, 0.0), surf(0.8, 68, -0.05)] },
  { id: 'iva', kind: 'artere', r: taper(0.11, 0.035), pts: [surf(0.42, 21, 0.1), surf(0.58, 36, 0.05), surf(0.78, 46, 0.0), surf(0.86, 49, -0.05)] },
  { id: 'circonflexe', kind: 'artere', r: taper(0.22, 0.12), pts: [surf(0.02, 38, 0.38), surf(0.0, 52, 0.44), surf(-0.02, 75, 0.45), surf(-0.02, 100, 0.45), surf(-0.02, 125, 0.43), surf(0.0, 148, 0.4)], anchorT: 0.5 },
  { id: 'circonflexe', kind: 'artere', r: taper(0.14, 0.04), pts: [surf(0.0, 88, 0.42), surf(0.2, 95, 0.1), surf(0.45, 100, 0.05), surf(0.7, 104, 0.0), surf(0.8, 105, -0.05)] },
  { id: 'coronaire-droite', kind: 'artere', r: taper(0.24, 0.17), sink: false, pts: [vadd(AO_L, [-1.1, -0.4, 0.9]), [-1.9, 0.6, 2.2], surf(0.0, -35, 0.45), surf(-0.02, -60, 0.46), surf(-0.02, -90, 0.46), surf(-0.02, -120, 0.45), surf(-0.02, -150, 0.44), surf(0.0, -170, 0.42)], anchorT: 0.45 },
  { id: 'coronaire-droite', kind: 'artere', r: taper(0.14, 0.04), pts: [surf(0.0, -88, 0.42), surf(0.2, -95, 0.1), surf(0.45, -100, 0.05), surf(0.68, -104, 0.0), surf(0.78, -105, -0.05)] },
  { id: 'coronaire-droite', kind: 'artere', r: taper(0.18, 0.06), pts: [surf(0.0, -170, 0.42), surf(0.15, -166, 0.24), surf(0.35, -164, 0.12), surf(0.55, -162, 0.1), surf(0.75, -160, 0.08), surf(0.9, -158, 0.05)] },
  { id: 'coronaire-droite', kind: 'artere', r: taper(0.09, 0.05), pts: [surf(0.0, -45, 0.45), [-2.5, 2.2, 1.9], [-2.9, 3.9, 0.6]] }, // branche du nœud sinusal
  // petites branches : diagonales et septales de l'IVA, marginales, branches du VD
  ...twigs('iva', null, 1, [[0.14, 25], [0.3, 22], [0.5, 19], [0.68, 17]]),
  ...twigs('iva', null, -1, [[0.22, 22], [0.4, 19.5], [0.6, 17.5], [0.78, 15]]),
  ...twigs('iva', null, 1, [[0.38, 45], [0.52, 56]], 0.05),
  ...twigs('circonflexe', null, 1, [[0.28, 97], [0.52, 101]], 0.05),
  ...twigs('circonflexe', null, -1, [[0.02, 115], [0.02, 135]], 0.07),
  ...twigs('coronaire-droite', null, 1, [[0.02, -55], [0.02, -72], [0.3, -97]], 0.07),
  ...twigs('coronaire-droite', null, -1, [[0.02, -112], [0.02, -135], [0.35, -165]], 0.06),
  ...twigs('iva', null, 1, [[0.1, 26], [0.22, 23.5], [0.4, 20.5], [0.58, 18.5], [0.76, 16], [0.88, 14]], 0.04),
  ...twigs('iva', null, -1, [[0.12, 24], [0.3, 21], [0.5, 18.5], [0.7, 16.5], [0.86, 14]], 0.035),
  ...twigs('iva', null, 1, [[0.3, 36], [0.46, 50], [0.62, 60], [0.66, 44]], 0.04),
  ...twigs('circonflexe', null, 1, [[0.15, 93], [0.38, 99], [0.6, 103]], 0.04),
  ...twigs('circonflexe', null, -1, [[0.02, 82], [0.02, 105], [0.02, 140]], 0.045),
  ...twigs('coronaire-droite', null, 1, [[0.02, -45], [0.02, -100], [0.15, -92], [0.5, -101]], 0.045),
  ...twigs('coronaire-droite', null, -1, [[0.02, -125], [0.02, -145], [0.2, -167], [0.5, -163]], 0.04),
  // branche rétroventriculaire gauche de la CD au-delà de la croix (dominance droite)
  { id: 'coronaire-droite', kind: 'artere', r: taper(0.12, 0.04), pts: [surf(0.0, -170, 0.42), surf(-0.01, 178, 0.42), surf(-0.01, 168, 0.4), surf(0.03, 158, 0.3), surf(0.18, 152, 0.1), surf(0.38, 148, 0.05), surf(0.5, 146, 0.0)] },
  // veines : grande veine du cœur (le long de l'IVA puis du sillon AV gauche), veine moyenne (sillon IV postérieur)
  { id: 'grande-veine-cardiaque', kind: 'veine', r: taper(0.09, 0.2), anchorT: 0.15, pts: [surf(0.85, 19, 0.04), surf(0.6, 22.5, 0.1), surf(0.35, 26, 0.14), surf(0.12, 31, 0.2), surf(0.02, 44, 0.32), surf(-0.02, 70, 0.4), surf(-0.03, 100, 0.42), surf(-0.04, 124, 0.44)] },
  { id: 'veine-cardiaque-moyenne', kind: 'veine', r: taper(0.08, 0.17), anchorT: 0.4, pts: [surf(0.88, -155, 0.03), surf(0.6, -158, 0.1), surf(0.3, -160.5, 0.14), surf(0.06, -163, 0.3), surf(-0.04, -164, 0.5)] },
];
// Sinus coronaire : face postérieure, dans le sillon AV, jusqu'à son ostium au plancher de l'OD
const scPts = [];
for (let th = 125; th <= 180; th += 11) scPts.push(surf(-0.05, th, 0.45));
for (let th = -180; th <= -160; th += 10) scPts.push(surf(-0.05, th, 0.55));
scPts.push([-2.6, 0.3, -0.5]);
GUIDES.push({ id: 'sinus-coronaire', kind: 'veine', r: (t) => 0.28 + 0.2 * t, pts: scPts, anchorT: 0.5 });

// Plaque chaque trajet sur la surface réelle de l'enveloppe : le vaisseau en dépasse d'un peu plus de la moitié
// de son diamètre, et ses branches terminales s'enfoncent dans le muscle (pas d'extrémité en moignon).
function gradField(p) {
  const e = 0.02;
  const g = [field(p[0] + e, p[1], p[2]) - field(p[0] - e, p[1], p[2]), field(p[0], p[1] + e, p[2]) - field(p[0], p[1] - e, p[2]), field(p[0], p[1], p[2] + e) - field(p[0], p[1], p[2] - e)];
  return vnorm(g);
}
function snap(pl, off) {
  let p = l2w(pl);
  for (let it = 0; it < 10; it++) {
    const d = field(p[0], p[1], p[2]) - off;
    if (Math.abs(d) < 0.003) break;
    p = vsub(p, vscale(gradField(p), Math.max(-0.6, Math.min(0.6, d))));
  }
  return w2l(p);
}
let coroCache = null;
// Trajets définitifs (repère local) : [{ id, kind, anchorT, pts: [[x, y, z]…], r: [rayon par point] }]. Calcul coûteux,
// fait hors ligne par tools/build-heart-mesh.mjs et stocké dans assets/heart.bin.
export function coronaryPaths() {
  if (coroCache) return coroCache;
  coroCache = GUIDES.map((c) => {
    const rr = typeof c.r === 'function' ? c.r : () => c.r;
    const S = sampleCurve(c.pts, 0.45);
    const pts = [], r = [];
    for (const { p, t } of S) {
      let off = rr(t) * (rr(0) >= 0.15 ? 0.5 : 0.35); // troncs bien lisibles, petites branches à fleur de muscle
      if (c.sink !== false && t > 0.8) off -= ((t - 0.8) / 0.2) * rr(t) * 1.5;
      pts.push(snap(p, off).map((v) => Math.round(v * 1000) / 1000));
      r.push(Math.round(rr(t) * 1000) / 1000);
    }
    return { id: c.id, kind: c.kind, anchorT: c.anchorT, pts, r };
  });
  return coroCache;
}
// rayon interpolé le long d'un trajet (t = fraction de longueur)
export const radiusAlong = (r) => (t) => { const x = Math.min(1, Math.max(0, t)) * (r.length - 1), i = Math.min(Math.floor(x), r.length - 2); return r[i] + (r[i + 1] - r[i]) * (x - i); };

// Champ des coronaires (occlusion ambiante de contact, calculée hors ligne)
let coroComps = null;
export function coronaryField(x, y, z) {
  if (!coroComps) coroComps = coronaryPaths().map((c) => chain({ id: c.id, tissue: 'vaisseau', color: [0, 0, 0], local: true, hollow: false, points: c.pts, r: radiusAlong(c.r), register: false }));
  const pl = w2l([x, y, z]);
  let d = 1e9;
  for (const c of coroComps) if (inBox(c, x, y, z)) d = Math.min(d, c.d(pl));
  return d;
}
