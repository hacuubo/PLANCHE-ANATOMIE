// Génère assets/heart.bin à partir des maillages BodyParts3D (licence CC BY 4.0) :
//   node tools/build-heart-bp3d.mjs <dossier partof_BP3D_4.0_obj_99> [--pas 0.12] [--apercu <fichier.json>]
// Données : https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html (partof_BP3D_4.0_obj_99.zip, 62 Mo).
// « BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International ».
//
// Étapes : lecture et classement des pièces (coronaires mises au calibre des atlas) → champs de distance → épaisseur du
// myocarde ventriculaire calée sur les coronaires → enveloppe (myocarde, oreillettes, gros vaisseaux ; pas de graisse dans
// les sillons : les artères coronaires restent visibles, comme sur les planches de référence) → cavités et lumières
// (solides de coupe) → carte 3D de la paroi (tranches de coupe) → repères → écriture binaire.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { surfaceNets } from './lib/surface-nets.mjs';
import { readPieces, loadMesh, mergeMeshes, classify, MeshSDF, PointCloud, smin, fbm, tubeSDF } from './lib/bp3d-heart.mjs';
import { avModel, slModel, mainComponent } from './lib/valve-landmarks.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DIR = args[0];
if (!DIR || !fs.existsSync(DIR)) { console.error('Usage : node tools/build-heart-bp3d.mjs <dossier partof_BP3D_4.0_obj_99>'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const H = parseFloat(opt('--pas', '0.12'));
const APERCU = opt('--apercu', null);
const T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0).padStart(4)} s]`, ...a);
const v3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: (a) => Math.hypot(a[0], a[1], a[2]), cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
v3.norm = (a) => v3.mul(a, 1 / (v3.len(a) || 1));
v3.dist = (a, b) => v3.len(v3.sub(a, b));

/* ─────────── teintes (sRGB) et tissus ─────────── */
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const TEINTES = {
  ventricule: hex(0xe2a09e), oreillette: hex(0xc98479), graisse: hex(0xf0d8c0),
  artere: hex(0xf3dac6), arterePulm: hex(0xd5daf0), veine: hex(0xd5daf0), veinePulm: hex(0xf1dccb), ligament: hex(0xefe6d6),
};
const VESSEL_COLOR = {
  aorte: 'artere', 'carotide-commune-gauche': 'artere', 'subclaviere-gauche': 'artere', 'tronc-brachio-cephalique': 'artere',
  'tronc-pulmonaire': 'arterePulm', 'artere-pulmonaire-droite': 'arterePulm', 'artere-pulmonaire-gauche': 'arterePulm',
  'veine-cave-superieure': 'veine', 'veine-cave-inferieure': 'veine', 'veines-pulmonaires': 'veinePulm', 'ligament-arteriel': 'ligament',
};
const ENV_IDS = ['ventricule-droit', 'ventricule-gauche', 'apex', 'oreillette-droite', 'auricule-droite', 'oreillette-gauche', 'auricule-gauche',
  'aorte', 'tronc-brachio-cephalique', 'carotide-commune-gauche', 'subclaviere-gauche', 'tronc-pulmonaire', 'artere-pulmonaire-droite',
  'artere-pulmonaire-gauche', 'ligament-arteriel', 'veine-cave-superieure', 'veine-cave-inferieure', 'veines-pulmonaires'];

/* ─────────── 1. lecture et classement ─────────── */
const pieces = readPieces(DIR).map((p) => ({ ...p, cls: classify(p.name) })).filter((p) => p.cls && p.file !== 'FJ3659.obj'); // FJ3659 : VCI abdominale
const by = (role, id) => pieces.filter((p) => p.cls.role === role && (!id || p.cls.id === id));
// Calibre des vaisseaux du cœur : BodyParts3D les donne fins (tronc commun 3,6 mm, IVA et coronaire droite 2,6 mm,
// branches ≈ 2 mm, sinus coronaire 2,9 mm). On les gonfle le long des normales vers les diamètres usuels des atlas et
// des séries angiographiques (tronc commun ≈ 4,5 mm, IVA proximale et coronaire droite ≈ 3,5 mm, branches ≈ 2,4 mm,
// sinus coronaire ≈ 6 mm) : les artères principales se lisent à la surface du cœur.
const CALIBRE = [
  [/^Trunk of left coronary artery$/, 0.05], [/^Coronary sinus$/, 0.13], [/^Great cardiac vein$/, 0.05],
  [/^Trunk of (right coronary artery|anterior interventricular branch of left coronary artery)$|^Circumflex branch of left coronary artery$/, 0.045],
  [/^Posterior interventricular branch of right coronary artery$/, 0.035],
];
function inflate(m, d) {
  const n = m.pos.length / 3, nor = new Float64Array(n * 3);
  let vol = 0;
  for (let t = 0; t < m.idx.length; t += 3) {
    const [a, b, c] = [m.idx[t], m.idx[t + 1], m.idx[t + 2]];
    const A = [m.pos[a * 3], m.pos[a * 3 + 1], m.pos[a * 3 + 2]], B = [m.pos[b * 3], m.pos[b * 3 + 1], m.pos[b * 3 + 2]], C = [m.pos[c * 3], m.pos[c * 3 + 1], m.pos[c * 3 + 2]];
    const f = v3.cross(v3.sub(B, A), v3.sub(C, A));
    vol += v3.dot(A, v3.cross(B, C));
    for (const i of [a, b, c]) { nor[i * 3] += f[0]; nor[i * 3 + 1] += f[1]; nor[i * 3 + 2] += f[2]; }
  }
  const s = vol < 0 ? -d : d; // maillage orienté vers l'intérieur : on inverse
  const pos = new Float64Array(m.pos);
  for (let i = 0; i < n; i++) { const l = Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]) || 1; for (let k = 0; k < 3; k++) pos[i * 3 + k] += nor[i * 3 + k] / l * s; }
  return { pos, idx: m.idx };
}
const loadPiece = (p) => {
  const m = loadMesh(DIR, p.file);
  if (p.cls.role !== 'coronaire' && p.cls.role !== 'veine') return m;
  const c = CALIBRE.find(([re]) => re.test(p.name));
  return inflate(m, c ? c[1] : 0.022);
};
const meshOf = (list) => mergeMeshes(list.map(loadPiece));
const idsOf = (role) => [...new Set(by(role).map((p) => p.cls.id))];
const named = (re) => meshOf(pieces.filter((p) => re.test(p.name)));
log(pieces.length, 'pièces BodyParts3D retenues');
const cav = {}, wall = {}, ves = {}, raw = { coronaire: {}, veine: {}, valve: {}, pilier: {} };
for (const id of idsOf('cavite')) cav[id] = meshOf(by('cavite', id));
for (const id of idsOf('paroi')) wall[id] = meshOf(by('paroi', id));
for (const id of idsOf('vaisseau')) ves[id] = meshOf(by('vaisseau', id));
for (const role of Object.keys(raw)) for (const id of idsOf(role)) raw[role][id] = meshOf(by(role, id));

const sdf = (m) => new MeshSDF(m.pos, m.idx, { cell: 0.4 });
const S = { VG: sdf(cav['ventricule-gauche']), VD: sdf(cav['ventricule-droit']), OGc: sdf(cav['oreillette-gauche']), ODc: sdf(cav['oreillette-droite']), OGw: sdf(wall['oreillette-gauche']), ODw: sdf(wall['oreillette-droite']) };
for (const id of Object.keys(ves)) S[id] = sdf(ves[id]);
const AORTE = ['Ascending aorta', 'Arch of aorta', 'Descending thoracic aorta'].map((n) => sdf(meshOf(pieces.filter((p) => p.name === n))));
const verts = (m) => { const o = []; for (let i = 0; i < m.pos.length / 3; i++) o.push([m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]]); return o; };
const meanOf = (pts) => { if (!pts.length) throw new Error('moyenne d\'une liste vide (repère introuvable)'); return v3.mul(pts.reduce((a, p) => v3.add(a, p), [0, 0, 0]), 1 / pts.length); };
const extreme = (pts, f) => pts.reduce((b, p) => (f(p) > f(b) ? p : b));
log('champs de distance des pièces prêts');
const cen0 = (m) => meanOf(verts(m));
const VC = { mitral: cen0(raw.valve['valve-mitrale']), tricus: cen0(raw.valve['valve-tricuspide']), aortic: cen0(raw.valve['valve-aortique']), pulmo: cen0(raw.valve['valve-pulmonaire']) };
// Repères des valves (modèle paramétrique de js/valves.js), calculés tôt : l'anneau des valves auriculo-ventriculaires
// sert aussi à ouvrir les orifices dans les cavités et à couper le muscle ventriculaire au-dessus de la base.
const leafPts = (re) => pieces.filter((p) => re.test(p.name)).map((p) => ({ name: p.name, pts: mainComponent(loadMesh(DIR, p.file)) }));
const junction = (Vc, Ac, Sa, Sv) => [...verts(Vc).filter((p) => Math.abs(Sa.query(...p, 1)) < 0.4), ...verts(Ac).filter((p) => Math.abs(Sv.query(...p, 1)) < 0.4)];
const VALVES = {
  'valve-mitrale': avModel({ leaflets: leafPts(/leaflet of mitral/), papillaries: leafPts(/papillary muscle of left ventricle/), mitral: true,
    ring: junction(cav['ventricule-gauche'], cav['oreillette-gauche'], S.OGc, S.VG), axis: v3.sub(cen0(cav['ventricule-gauche']), cen0(cav['oreillette-gauche'])) }),
  'valve-tricuspide': avModel({ leaflets: leafPts(/leaflet of tricuspid/), papillaries: leafPts(/papillary muscle of right ventricle/),
    ring: junction(cav['ventricule-droit'], cav['oreillette-droite'], S.ODc, S.VD), axis: v3.sub(cen0(cav['ventricule-droit']), cen0(cav['oreillette-droite'])) }),
  'valve-aortique': slModel({ cusps: leafPts(/cusp of aortic/), axis: v3.sub(cen0(named(/^Ascending aorta$/)), VC.aortic) }),
  'valve-pulmonaire': slModel({ cusps: leafPts(/cusp of pulmonary/), axis: v3.sub(cen0(ves['tronc-pulmonaire']), VC.pulmo) }),
};
for (const [id, v] of Object.entries(VALVES)) log('valve', id, 'rayon', (v.radii ? v.radii.map((r) => r.toFixed(2)).join(' × ') : v.radius.toFixed(2)), v.leaflets ? `${v.leaflets.length} feuillets, ${v.papillaries.length} piliers` : `${v.cusps.length} cuspides`);
const AVM = VALVES['valve-mitrale'], AVT = VALVES['valve-tricuspide'];
// Orifice auriculo-ventriculaire : cylindre de rayon 0,85 × anneau, de 0,6 cm côté oreillette à 1,2 cm côté ventricule.
// Les cavités BodyParts3D de l'oreillette et du ventricule ne se touchent pas toujours à l'anneau : sans lui, la coupe
// montrerait une cloison de muscle entre oreillette et ventricule.
const orifice = (v) => { const Rm = (v.radii[0] + v.radii[1]) / 2; return (x, y, z) => {
  const q = v3.sub([x, y, z], v.center), al = v3.dot(q, v.axis), r = v3.len(v3.sub(q, v3.mul(v.axis, al)));
  return Math.max(r - 0.85 * Rm, Math.abs(al - 0.3) - 0.9); }; };
const ORI = [orifice(AVM), orifice(AVT)];
// Base du cœur : pas de muscle ventriculaire au-dessus des valves (cylindres le long de la racine aortique, du tronc
// pulmonaire et vers les oreillettes) ; seules les parois artérielles et auriculaires y restent.
const BASE_CUTS = [
  [VC.aortic, v3.norm(v3.sub(cen0(named(/^Ascending aorta$/)), VC.aortic)), 0.15, 1.9],
  [VC.pulmo, v3.norm(v3.sub(cen0(ves['tronc-pulmonaire']), VC.pulmo)), 0.15, 1.9],
  // valves auriculo-ventriculaires : à partir de l'anneau réel (centre paramétrique), côté oreillette
  [AVM.center, v3.mul(AVM.axis, -1), 0.1, 2.6],
  [AVT.center, v3.mul(AVT.axis, -1), 0.1, 2.8],
];
const baseCut = (x, y, z) => {
  let m = 1e9;
  for (const [c, a, off, R] of BASE_CUTS) { const q = [x - c[0], y - c[1], z - c[2]]; const al = v3.dot(q, a); m = Math.min(m, Math.max(v3.len(v3.sub(q, v3.mul(a, al))) - R, off - al)); }
  return m; // < 0 : région où le myocarde ventriculaire est retiré
};

/* ─────────── 2. pièces absentes de BodyParts3D ─────────── */
// Tronc brachio-céphalique : de la crosse à la bifurcation carotide commune / subclavière droites
const J = (() => { const a = extreme(verts(named(/^Right common carotid artery$/)), (p) => -p[1]); const b = extreme(verts(named(/^Right subclavian artery$/)), (p) => p[0]); return meanOf([a, b]); })();
const O = verts(ves.aorte).reduce((b, p) => (v3.dist(p, J) < v3.dist(b, J) ? p : b));
// Ligament artériel : de l'artère pulmonaire gauche vers la face inférieure de la crosse (≈ 0,8 cm de long)
const LIG = (() => {
  const lpa = verts(ves['artere-pulmonaire-gauche']).filter((p) => p[0] > 0.5 && p[0] < 3.5);
  const top = extreme(lpa, (p) => p[1] - 0.3 * Math.abs(p[2] + 2));
  return [v3.add(top, [0, -0.15, 0]), v3.add(top, [0.1, 0.9, -0.3])];
})();
const ligSDF = tubeSDF(LIG, 0.17);

/* ─────────── 3. myocarde ventriculaire : épaisseur calée sur les coronaires ─────────── */
// Distance aux cavités ventriculaires, lissée : union douce VG/VD (pas de pli au septum) puis flou gaussien 3D
// (la surface externe ne recopie pas les creux laissés par les piliers dans le maillage des cavités).
// wLV = 1 près du VG, 0 près du VD (épaisseur minimale différente pour chaque ventricule).
const VG0 = (() => {
  const v = 0.2, mn = [0, 1, 2].map((k) => Math.min(S.VG.bmin[k], S.VD.bmin[k]) - 2.6), mx = [0, 1, 2].map((k) => Math.max(S.VG.bmax[k], S.VD.bmax[k]) + 2.6);
  const n = [0, 1, 2].map((k) => Math.ceil((mx[k] - mn[k]) / v) + 1), N = n[0] * n[1] * n[2];
  const gd = new Float32Array(N), gw = new Float32Array(N);
  for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
    const x = mn[0] + i * v, y = mn[1] + j * v, z = mn[2] + k * v;
    const l = S.VG.query(x, y, z, 3), r = S.VD.query(x, y, z, 3), id = (k * n[1] + j) * n[0] + i;
    gd[id] = smin(l, r, 1.0); gw[id] = 1 / (1 + Math.exp(-(r - l) / 0.4));
  }
  const blur = (g, sigma) => {
    const R = Math.ceil(2.5 * sigma), w = []; for (let d = -R; d <= R; d++) w.push(Math.exp(-(d * d) / (2 * sigma * sigma)));
    const ws = w.reduce((a, b) => a + b, 0);
    for (let axis = 0; axis < 3; axis++) {
      const src = g.slice(), st = axis === 0 ? 1 : axis === 1 ? n[0] : n[0] * n[1];
      for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
        const c = [i, j, k][axis], id = (k * n[1] + j) * n[0] + i; let s = 0;
        for (let d = -R; d <= R; d++) { const cc = Math.min(n[axis] - 1, Math.max(0, c + d)); s += w[d + R] * src[id + (cc - c) * st]; }
        g[id] = s / ws;
      }
    }
  };
  blur(gd, 1.5); blur(gw, 2);
  const sample = (g) => (x, y, z) => {
    const fx = (x - mn[0]) / v, fy = (y - mn[1]) / v, fz = (z - mn[2]) / v;
    if (fx < 0 || fy < 0 || fz < 0 || fx >= n[0] - 1 || fy >= n[1] - 1 || fz >= n[2] - 1) return null;
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz), u = fx - i, t = fy - j, q = fz - k;
    const at = (a, b, c) => g[((k + c) * n[1] + (j + b)) * n[0] + (i + a)];
    const L = (a, b, s) => a + (b - a) * s;
    return L(L(L(at(0, 0, 0), at(1, 0, 0), u), L(at(0, 1, 0), at(1, 1, 0), u), t), L(L(at(0, 0, 1), at(1, 0, 1), u), L(at(0, 1, 1), at(1, 1, 1), u), t), q);
  };
  return { d: sample(gd), w: sample(gw) };
})();
const dV = (x, y, z) => { const d = VG0.d(x, y, z); return d === null ? 2.6 : d; };
const wLV = (x, y, z) => { const w = VG0.w(x, y, z); return w === null ? 0.5 : w; };
const gradOf = (f, p, e = 0.03) => v3.norm([f(p[0] + e, p[1], p[2]) - f(p[0] - e, p[1], p[2]), f(p[0], p[1] + e, p[2]) - f(p[0], p[1] - e, p[2]), f(p[0], p[1], p[2] + e) - f(p[0], p[1], p[2] - e)]);
const cluster = (meshes, size) => {
  const acc = new Map();
  for (const m of meshes) for (let i = 0; i < m.pos.length / 3; i++) {
    const x = m.pos[i * 3], y = m.pos[i * 3 + 1], z = m.pos[i * 3 + 2];
    const k = `${Math.floor(x / size)},${Math.floor(y / size)},${Math.floor(z / size)}`;
    let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0, 0]); a[0] += x; a[1] += y; a[2] += z; a[3]++;
  }
  return [...acc.values()].map((a) => [a[0] / a[3], a[1] / a[3], a[2] / a[3]]);
};
// surface épicardique ≈ 0,2 cm sous l'axe des artères : les vaisseaux restent en relief, enchâssés à moitié
const samples = cluster(Object.values(raw.coronaire), 0.3).map((p) => [...p, dV(...p) - 0.2]).filter((s) => s[3] > -0.05 && s[3] < 2.4);
const tMed = samples.map((s) => s[3]).sort((a, b) => a - b)[samples.length >> 1];
const sCloud = new PointCloud(samples, 0.8);
const thickRaw = (x, y, z) => {
  let sw = 0, st = 0;
  for (const [i, d] of sCloud.within(x, y, z, 3)) { const w = Math.exp(-((d / 1.1) ** 2)); sw += w; st += w * samples[i][3]; }
  return Math.min(1.6, Math.max(0.35, sw > 1e-3 ? (st + 0.02 * tMed) / (sw + 0.02) : tMed));
};
const grid3 = (mn, mx, v, fn) => {
  const n = [0, 1, 2].map((k) => Math.ceil((mx[k] - mn[k]) / v) + 2), g = new Float32Array(n[0] * n[1] * n[2]);
  for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) g[(k * n[1] + j) * n[0] + i] = fn(mn[0] + i * v, mn[1] + j * v, mn[2] + k * v);
  return (x, y, z) => {
    const fx = Math.min(n[0] - 1.001, Math.max(0, (x - mn[0]) / v)), fy = Math.min(n[1] - 1.001, Math.max(0, (y - mn[1]) / v)), fz = Math.min(n[2] - 1.001, Math.max(0, (z - mn[2]) / v));
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz), u = fx - i, w = fy - j, q = fz - k;
    const at = (a, b, c) => g[((k + c) * n[1] + (j + b)) * n[0] + (i + a)];
    const L = (a, b, t) => a + (b - a) * t;
    return L(L(L(at(0, 0, 0), at(1, 0, 0), u), L(at(0, 1, 0), at(1, 1, 0), u), w), L(L(at(0, 0, 1), at(1, 0, 1), u), L(at(0, 1, 1), at(1, 1, 1), u), w), q);
  };
};
const VB = { min: [0, 1, 2].map((k) => Math.min(S.VG.bmin[k], S.VD.bmin[k]) - 2.5), max: [0, 1, 2].map((k) => Math.max(S.VG.bmax[k], S.VD.bmax[k]) + 2.5) };
const thick = grid3(VB.min, VB.max, 0.35, thickRaw);
log(samples.length, 'échantillons coronaires ; épaisseur médiane du myocarde', tMed.toFixed(2), 'cm');

/* ─────────── 4 bis. veine interventriculaire antérieure (absente de BodyParts3D) ─────────── */
// Portion antérieure de la grande veine du cœur : longe l'IVA du côté du VG, de la pointe jusqu'au sillon AV gauche
// où elle rejoint la grande veine de BodyParts3D. Construite comme un tube posé à côté du tronc de l'IVA.
function tubeMesh(pts, rFn, radial = 10) {
  const pos = [], idx = [], n = pts.length;
  let prevN = null;
  for (let i = 0; i < n; i++) {
    const t = v3.norm(v3.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
    let nn = prevN ? v3.norm(v3.sub(prevN, v3.mul(t, v3.dot(prevN, t)))) : v3.norm(v3.cross(t, Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    prevN = nn;
    const bb = v3.cross(t, nn), r = rFn(i / (n - 1));
    for (let j = 0; j < radial; j++) { const a = (j / radial) * Math.PI * 2; pos.push(...v3.add(pts[i], v3.add(v3.mul(nn, r * Math.cos(a)), v3.mul(bb, r * Math.sin(a))))); }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial; idx.push(a, c, b, b, c, d); }
  // extrémités fermées
  for (const [ring, flip] of [[0, true], [n - 1, false]]) { const c = pos.length / 3; pos.push(...pts[ring]); for (let j = 0; j < radial; j++) { const a = ring * radial + j, b = ring * radial + (j + 1) % radial; if (flip) idx.push(c, b, a); else idx.push(c, a, b); } }
  return { pos: new Float64Array(pos), idx: new Uint32Array(idx) };
}
{
  const lad = cluster([named(/^Trunk of anterior interventricular branch of left coronary artery$/)], 0.45);
  // ordre le long du vaisseau : chaîne du plus proche voisin depuis le point le plus haut
  const chain = [extreme(lad, (p) => p[1])], rest = lad.filter((p) => p !== chain[0]);
  while (rest.length) { const last = chain[chain.length - 1]; let bi = 0; rest.forEach((p, i) => { if (v3.dist(p, last) < v3.dist(rest[bi], last)) bi = i; }); if (v3.dist(rest[bi], last) > 1.2) break; chain.push(rest.splice(bi, 1)[0]); }
  const side = chain.map((p, i) => {
    const t = v3.norm(v3.sub(chain[Math.min(chain.length - 1, i + 1)], chain[Math.max(0, i - 1)]));
    const nn = gradOf(dV, p);
    let s = v3.norm(v3.cross(t, nn));
    if (wLV(...v3.add(p, v3.mul(s, 0.4))) < wLV(...v3.sub(p, v3.mul(s, 0.4)))) s = v3.mul(s, -1);
    return v3.sub(v3.add(p, v3.mul(s, 0.4)), v3.mul(nn, 0.04)); // à côté de l'IVA (calibre des atlas)
  });
  // lissage du trajet, puis raccord à la grande veine (point le plus proche du haut de l'IVA)
  const smooth = side.map((p, i) => meanOf(side.slice(Math.max(0, i - 2), i + 3)));
  const gcv = verts(named(/^Great cardiac vein$/));
  const join = gcv.reduce((b, p) => (v3.dist(p, smooth[0]) < v3.dist(b, smooth[0]) ? p : b));
  const path = [...smooth.slice(2).reverse(), smooth[0], join];
  const aiv = tubeMesh(path, (t) => 0.08 + 0.1 * t);
  raw.veine['grande-veine-cardiaque'] = mergeMeshes([raw.veine['grande-veine-cardiaque'], aiv]);
  log('veine interventriculaire antérieure :', path.length, 'points, raccordée à la grande veine à', v3.dist(smooth[0], join).toFixed(1), 'cm');
}

/* ─────────── 5. enveloppe ─────────── */
const TRIM = {
  aorte: (x, y) => -(y + 8), 'veine-cave-inferieure': (x, y) => -(y + 6.5), 'veine-cave-superieure': (x, y) => y - 12.5,
  'carotide-commune-gauche': (x, y) => y - 13.6, 'subclaviere-gauche': (x) => x - 4.8, 'tronc-brachio-cephalique': (x, y) => Math.max(y - 13.6, -x - 4.8),
  'artere-pulmonaire-droite': (x) => -x - 4.9, 'artere-pulmonaire-gauche': (x) => x - 5.0, 'veines-pulmonaires': (x) => Math.abs(x - 0.6) - 4.1,
};
const vessel = (id) => (x, y, z) => { let d = S[id].query(x, y, z, 1.5); if (TRIM[id]) d = Math.max(d, TRIM[id](x, y, z)); return d; };
const PARTS = {
  // les trois segments de l'aorte sont des pièces distinctes : raccord lisse entre eux (pas de couture)
  aorte: (x, y, z) => Math.max(smin(smin(AORTE[0].query(x, y, z, 1.5), AORTE[1].query(x, y, z, 1.5), 0.5), AORTE[2].query(x, y, z, 1.5), 0.5), TRIM.aorte(x, y, z)),
  'carotide-commune-gauche': vessel('carotide-commune-gauche'), 'subclaviere-gauche': vessel('subclaviere-gauche'),
  'tronc-brachio-cephalique': vessel('tronc-brachio-cephalique'),
  'ligament-arteriel': ligSDF, 'tronc-pulmonaire': vessel('tronc-pulmonaire'), 'artere-pulmonaire-droite': vessel('artere-pulmonaire-droite'),
  'artere-pulmonaire-gauche': vessel('artere-pulmonaire-gauche'), 'veine-cave-superieure': vessel('veine-cave-superieure'),
  'veine-cave-inferieure': vessel('veine-cave-inferieure'), 'veines-pulmonaires': vessel('veines-pulmonaires'),
};
const ASSEMBLIES = [
  { k: 0.4, parts: [['aorte', 0], ['carotide-commune-gauche', 0.3], ['subclaviere-gauche', 0.3], ['tronc-brachio-cephalique', 0.3], ['ligament-arteriel', 0.15]] },
  { k: 0.4, parts: [['tronc-pulmonaire', 0], ['artere-pulmonaire-droite', 0.3], ['artere-pulmonaire-gauche', 0.3]] },
  { k: 0.4, parts: [['veine-cave-superieure', 0]] }, { k: 0.4, parts: [['veine-cave-inferieure', 0]] }, { k: 0.35, parts: [['veines-pulmonaires', 0]] },
];
const core = (x, y, z) => {
  // épaisseur : celle des coronaires, au moins ≈ 1 cm pour le VG et 0,35 cm pour le VD (fiche : 8–12 mm et 3–5 mm)
  const myo = -smin(-(dV(x, y, z) - Math.max(thick(x, y, z), 0.35 + 0.65 * wLV(x, y, z))), baseCut(x, y, z), 0.3);
  const od = smin(S.ODw.query(x, y, z, 1.5), S.ODc.query(x, y, z, 1.5), 0.25);
  const og = smin(S.OGw.query(x, y, z, 1.5), S.OGc.query(x, y, z, 1.5), 0.25);
  return { myo, od, og, all: smin(smin(myo, od, 0.5), og, 0.5) };
};
// Cavités réelles, réunies par les orifices auriculo-ventriculaires
const cavField = (x, y, z) => Math.min(S.VG.query(x, y, z, 2), S.VD.query(x, y, z, 2), S.OGc.query(x, y, z, 2), S.ODc.query(x, y, z, 2), ...ORI.map((f) => f(x, y, z)));
const field = (x, y, z) => {
  const c = core(x, y, z).all;
  let f = c;
  for (const A of ASSEMBLIES) {
    let a = 1e9;
    for (const [id, k] of A.parts) { const d = PARTS[id](x, y, z); a = k ? smin(a, d, k) : Math.min(a, d); }
    f = Math.min(f, smin(a, c, A.k));
  }
  return Math.min(f, cavField(x, y, z) - 0.12); // les cavités sont toujours contenues dans l'enveloppe (paroi ≥ 1,2 mm)
};

// Lissage de Taubin (λ/μ) : retire le grain des maillages réduits sans faire maigrir la forme
function taubin(mesh, iters = 6, lambda = 0.5, mu = -0.53) {
  const n = mesh.verts.length, nb = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < mesh.tris.length; t += 3) { const [a, b, c] = [mesh.tris[t], mesh.tris[t + 1], mesh.tris[t + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  const nbs = nb.map((s) => [...s]);
  const step = (f) => {
    const next = mesh.verts.map((p, i) => { const l = nbs[i]; if (!l.length) return p; const m = [0, 0, 0]; for (const j of l) { const q = mesh.verts[j]; m[0] += q[0]; m[1] += q[1]; m[2] += q[2]; } return [p[0] + f * (m[0] / l.length - p[0]), p[1] + f * (m[1] / l.length - p[1]), p[2] + f * (m[2] / l.length - p[2])]; });
    mesh.verts = next;
  };
  for (let i = 0; i < iters; i++) { step(lambda); step(mu); }
  return mesh;
}
function subdivide(mesh) {
  const verts = mesh.verts.map((p) => p.slice()), mid = new Map(), tris = [];
  const m = (a, b) => { const k = a < b ? a * 1e7 + b : b * 1e7 + a; let i = mid.get(k); if (i === undefined) { i = verts.length; verts.push(v3.mul(v3.add(mesh.verts[a], mesh.verts[b]), 0.5)); mid.set(k, i); } return i; };
  for (let t = 0; t < mesh.tris.length; t += 3) { const [a, b, c] = [mesh.tris[t], mesh.tris[t + 1], mesh.tris[t + 2]]; const ab = m(a, b), bc = m(b, c), ca = m(c, a); tris.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca); }
  return { verts, tris };
}
function vertexNormals(mesh) {
  const n = mesh.verts.map(() => [0, 0, 0]);
  for (let t = 0; t < mesh.tris.length; t += 3) {
    const [a, b, c] = [mesh.tris[t], mesh.tris[t + 1], mesh.tris[t + 2]].map((i) => mesh.verts[i]);
    const f = v3.cross(v3.sub(b, a), v3.sub(c, a));
    for (const i of [mesh.tris[t], mesh.tris[t + 1], mesh.tris[t + 2]]) { n[i][0] += f[0]; n[i][1] += f[1]; n[i][2] += f[2]; }
  }
  mesh.normals = n.map(v3.norm);
  return mesh;
}
const extract = (fn, B, h, smooth = 6) => { const m = surfaceNets(fn, B, h, { project: 1 }); if (smooth) taubin(m, smooth); return vertexNormals(m); };

const ENV_B = { min: [-7.5, -8.6, -8.5], max: [7.5, 15, 7.5] };
log(`enveloppe : extraction au pas de ${H} cm…`);
const env = extract(field, ENV_B, H, 10);
log('enveloppe :', env.verts.length, 'sommets,', env.tris.length / 3, 'triangles');
const proxy = extract(field, ENV_B, 0.3, 2);
log('maillage de clic :', proxy.verts.length, 'sommets');

/* ─────────── 6. cavités et lumières (solides de coupe) ─────────── */
const cavities = extract(cavField, { min: [-6, -6.5, -6.5], max: [6.5, 5.5, 5] }, 0.1, 4);
log('cavités :', cavities.verts.length, 'sommets');
{ // contrôle : chaque point des cavités (1 mm vers l'intérieur) est dans l'enveloppe
  let ok = 0; cavities.verts.forEach((p, i) => { const n = cavities.normals[i]; if (field(p[0] - n[0] * 0.1, p[1] - n[1] * 0.1, p[2] - n[2] * 0.1) < 0) ok++; });
  log(`contrôle : ${(100 * ok / cavities.verts.length).toFixed(2)} % des cavités dans l'enveloppe`);
}
const lumen = (ids) => (x, y, z) => Math.min(...ids.map((id) => PARTS[id](x, y, z))) + 0.15; // paroi ≈ 1,5 mm
const lumA = extract(lumen(['aorte', 'carotide-commune-gauche', 'subclaviere-gauche', 'tronc-brachio-cephalique', 'veines-pulmonaires']), ENV_B, 0.22, 2);
const lumV = extract(lumen(['tronc-pulmonaire', 'artere-pulmonaire-droite', 'artere-pulmonaire-gauche', 'veine-cave-superieure', 'veine-cave-inferieure']), ENV_B, 0.22, 2);
log('lumières :', lumA.verts.length + lumV.verts.length, 'sommets');

/* ─────────── 7. repères anatomiques ─────────── */
const cen = (m) => meanOf(verts(m));
const mitral = cen(raw.valve['valve-mitrale']), tricus = cen(raw.valve['valve-tricuspide']);
const aortic = cen(raw.valve['valve-aortique']), pulmo = cen(raw.valve['valve-pulmonaire']);
const BASE = meanOf([mitral, tricus]);
const lvApexIn = extreme(verts(cav['ventricule-gauche']), (p) => v3.dist(p, BASE));
const AXIS = v3.norm(v3.sub(lvApexIn, BASE));
const APEX = v3.add(lvApexIn, v3.mul(AXIS, thick(...lvApexIn)));
// plan « quatre cavités » : contient l'axe du cœur et passe par les valves mitrale et tricuspide ; normale vers
// l'avant-haut (c'est de ce côté que l'on regarde la coupe)
let N4 = v3.norm(v3.cross(AXIS, v3.sub(mitral, tricus)));
if (v3.dot(N4, [0, 1, 0.4]) < 0) N4 = v3.mul(N4, -1);
const Uf = v3.norm(v3.sub([0, 0, 1], v3.mul(AXIS, AXIS[2])));
const Vf = v3.norm(v3.cross(Uf, AXIS));
// région de l'apex : sommets de l'enveloppe à moins de 1,4 cm de la pointe
const autoAur = (wm, cm, score, R) => { const tip = extreme(verts(wm), score); return (p) => v3.dist(p, tip) < R && v3.dot(v3.sub(p, cen(cm)), v3.sub(tip, cen(cm))) > 0; };
const isAurD = autoAur(wall['oreillette-droite'], cav['oreillette-droite'], (p) => p[2] + 0.7 * p[0], 2.4);
const isAurG = autoAur(wall['oreillette-gauche'], cav['oreillette-gauche'], (p) => p[2] + 0.3 * p[0], 2.0);

/* ─────────── 8. attributs de l'enveloppe ─────────── */
const coroAll = mergeMeshes([...Object.values(raw.coronaire), ...Object.values(raw.veine)]);
const coroSDF = sdf(coroAll);
const TISSU = { muscle: [0, 0, 0], oreillette: [0, 0, 1], graisse: [1, 0, 0], vaisseau: [0, 1, 0] };
function attributes(p) {
  const c = core(...p);
  const cand = [['myo', c.myo, TEINTES.ventricule, TISSU.muscle], ['od', c.od, TEINTES.oreillette, TISSU.oreillette], ['og', c.og, TEINTES.oreillette, TISSU.oreillette]];
  for (const id of Object.keys(PARTS)) cand.push([id, PARTS[id](...p), TEINTES[VESSEL_COLOR[id]], TISSU.vaisseau]);
  let dmin = 1e9, best = null;
  for (const k of cand) if (k[1] < dmin) { dmin = k[1]; best = k; }
  const col = [0, 0, 0], tis = [0, 0, 0]; let ws = 0;
  for (const [, d, cc, tt] of cand) { const w = Math.exp(-(d - dmin) / 0.09); if (w < 1e-3) continue; for (let k = 0; k < 3; k++) { col[k] += w * cc[k]; tis[k] += w * tt[k]; } ws += w; }
  const m = 0.94 + 0.12 * fbm(p[0] * 0.7 + 3.1, p[1] * 0.7, p[2] * 0.7);
  for (let k = 0; k < 3; k++) { col[k] = Math.min(1, col[k] / ws * m); tis[k] /= ws; }
  let id = best[0];
  if (id === 'myo') id = v3.dist(p, APEX) < 1.4 ? 'apex' : S.VD.query(...p, 3) < S.VG.query(...p, 3) ? 'ventricule-droit' : 'ventricule-gauche';
  else if (id === 'od') id = isAurD(p) ? 'auricule-droite' : 'oreillette-droite';
  else if (id === 'og') id = isAurG(p) ? 'auricule-gauche' : 'oreillette-gauche';
  return { sid: ENV_IDS.indexOf(id), col, tis };
}
const AO_D = [0.12, 0.3, 0.6, 1.0, 1.6], AO_W = [0.3, 0.25, 0.2, 0.15, 0.1];
const occ = (x, y, z) => Math.min(field(x, y, z), Math.abs(coroSDF.query(x, y, z, 1.7)));
env.attrs = env.verts.map((p, i) => {
  const a = attributes(p), n = env.normals[i];
  let o = 0;
  for (let s = 0; s < AO_D.length; s++) { const d = AO_D[s]; const f = occ(p[0] + n[0] * d, p[1] + n[1] * d, p[2] + n[2] * d); o += AO_W[s] * Math.min(1, Math.max(0, (d - f) / d)); }
  a.ao = Math.min(1, Math.max(0.15, 1 - 1.25 * o));
  return a;
});
proxy.sid = proxy.verts.map((p) => attributes(p).sid);
const CAV_IDS = { VG: 'ventricule-gauche', VD: 'ventricule-droit', OGc: 'oreillette-gauche', ODc: 'oreillette-droite' };
cavities.sid = cavities.verts.map((p) => { let b = 'VG', bd = 1e9; for (const k of Object.keys(CAV_IDS)) { const d = Math.abs(S[k].query(...p, 2)); if (d < bd) { bd = d; b = k; } } return ENV_IDS.indexOf(CAV_IDS[b]); });
log('attributs et occlusion ambiante calculés');

/* ─────────── 8 bis. endocarde : trabécules charnues ─────────── */
// Les ventricules sont tapissés de colonnes musculaires (trabécules) orientées surtout de la base vers la pointe, plus
// denses vers l'apex ; les chambres de chasse (sous les valves aortique et pulmonaire) et les oreillettes sont lisses.
// Relief réel du maillage (le muscle avance dans la cavité), crêtes plus claires, creux plus sombres.
{
  const L = v3.dist(BASE, lvApexIn);
  const hgt = [];
  // distance aux muscles papillaires : les trabécules ne doivent pas engloutir leur corps
  const PAP = Object.values(raw.pilier).flatMap((m) => verts(m));
  const dPap = (p) => { let d = 1e9; for (const q of PAP) { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (dd < d) d = dd; } return Math.sqrt(d); };
  cavities.verts = cavities.verts.map((p, i) => {
    const id = ENV_IDS[cavities.sid[i]], n = cavities.normals[i];
    const ventr = id === 'ventricule-gauche' || id === 'ventricule-droit';
    if (!ventr) { hgt.push(0); return p; }
    const t = v3.dot(v3.sub(p, BASE), AXIS) / L;
    let w = Math.min(1, Math.max(0, (t - 0.12) / 0.4));
    for (const [c, r] of [[aortic, 2.6], [pulmo, 2.8]]) { const d = v3.dist(p, c); if (d < r) w *= (d / r) ** 2; }
    if (w > 0) { const t2 = Math.min(1, Math.max(0, (dPap(p) - 0.15) / 0.25)); w *= t2 * t2 * (3 - 2 * t2); }
    const q = [v3.dot(p, Vf), v3.dot(p, Uf), v3.dot(p, AXIS)];
    const r1 = 1 - Math.abs(2 * fbm(q[0] * 2.1, q[1] * 2.1, q[2] * 0.5) - 1);
    const r2 = 1 - Math.abs(2 * fbm(q[0] * 3.6 + 5, q[1] * 3.6 + 2, q[2] * 1.3) - 1);
    const ridge = Math.pow(Math.max(r1, 0.75 * r2), 3);
    const amp = (id === 'ventricule-droit' ? 0.32 : 0.26) * w;
    hgt.push(ridge * w);
    return v3.sub(p, v3.mul(n, amp * ridge)); // vers l'intérieur de la cavité
  });
  taubin(cavities, 1, 0.4, -0.42); vertexNormals(cavities);
  const VEN = hex(0xc9636d), ATR = hex(0xc8737a);
  cavities.col = cavities.verts.map((p, i) => {
    const id = ENV_IDS[cavities.sid[i]], h = hgt[i], base = id.startsWith('oreillette') ? ATR : VEN;
    const m = (0.86 + 0.3 * h) * (0.95 + 0.1 * fbm(p[0] * 1.3, p[1] * 1.3, p[2] * 1.3));
    return [...base.map((c) => Math.min(1, c * m)), 0.72 + 0.28 * Math.min(1, h * 1.6 + 0.3)];
  });
  log('endocarde : trabécules appliquées');
}

/* ─────────── 8 ter. repères des valves : calculés en section 1 (VALVES) ─────────── */

/* ─────────── 9. conduction, trajets du sang, ancres ─────────── */
// Septum interventriculaire : surface médiane entre les deux cavités (|dVG − dVD| ≈ 0), à plusieurs niveaux de l'axe
const septum = [];
for (const f of [0.05, 0.14, 0.27, 0.42, 0.56, 0.7]) {
  const c = v3.add(BASE, v3.mul(AXIS, f * v3.dist(BASE, lvApexIn)));
  let best = null, bs = 1e9;
  for (let a = -4; a <= 4; a += 0.15) for (let b = -4; b <= 4; b += 0.15) {
    const p = v3.add(c, v3.add(v3.mul(Uf, a), v3.mul(Vf, b)));
    const l = S.VG.query(...p, 2), r = S.VD.query(...p, 2);
    if (l < 0.2 || r < 0.15) continue;
    const s = Math.abs(l - r) + 0.15 * (l + r) - 0.05 * a; // milieu de la cloison, sur sa partie antérieure (crête)
    if (s < bs) { bs = s; best = p; }
  }
  if (best) septum.push(best);
}
const septumS = septum.map((p, i) => meanOf([septum[Math.max(0, i - 1)], p, p, septum[Math.min(septum.length - 1, i + 1)]]));
const toward = (p, S1, off) => { const g = gradOf((x, y, z) => S1.query(x, y, z, 2), p); const d = S1.query(...p, 2); return v3.sub(p, v3.mul(g, d - off)); };
const cs = verts(named(/^Coronary sinus$/)); const odC = cen(cav['oreillette-droite']);
const csOstium = cs.reduce((b, p) => (v3.dist(p, odC) < v3.dist(b, odC) ? p : b));
const septalLeaflet = cen(named(/^Septal leaflet of tricuspid valve$/));
const AV_NODE = v3.add(v3.mul(v3.add(csOstium, septalLeaflet), 0.5), v3.mul(v3.norm(v3.sub(cen(cav['oreillette-gauche']), odC)), 0.3));
const svc = verts(ves['veine-cave-superieure']); const svcLow = svc.filter((p) => p[1] < Math.min(...svc.map((q) => q[1])) + 0.8);
const SA_NODE = v3.add(meanOf(svcLow), [-0.6, -0.3, 0.5]);
const papAnt = cen(named(/^Anterior papillary muscle of right ventricle$/));
const conduction = {
  'noeud-sinusal': [SA_NODE], 'noeud-av': [AV_NODE],
  his: [AV_NODE, v3.add(v3.mul(AV_NODE, 0.5), v3.mul(septumS[0], 0.5)), septumS[0]],
  brancheG: septumS.map((p) => toward(p, S.VG, 0.08)),
  brancheD: [septumS[0], toward(septumS[1], S.VD, 0.08), toward(septumS[2], S.VD, 0.08), toward(septumS[3], S.VD, 0.08), papAnt],
};
// trajets du sang : centres des cavités, des valves et des vaisseaux
const top = (m, n = 0.6) => { const p = verts(m); const t = Math.max(...p.map((q) => q[1])); return meanOf(p.filter((q) => q[1] > t - n)); };
const end = (m, f) => { const p = verts(m); const best = extreme(p, f); return meanOf(p.filter((q) => v3.dist(q, best) < 0.9)); };
const vg = cen(cav['ventricule-gauche']), vd = cen(cav['ventricule-droit']), ogC = cen(cav['oreillette-gauche']);
const lvLow = v3.add(BASE, v3.mul(AXIS, 0.6 * v3.dist(BASE, lvApexIn)));
const rvLow = v3.add(vd, v3.mul(AXIS, 1.2));
const ptTop = top(ves['tronc-pulmonaire'], 0.8);
const rpaEnd = end(ves['artere-pulmonaire-droite'], (p) => -p[0]), lpaEnd = end(ves['artere-pulmonaire-gauche'], (p) => p[0]);
const asc = cen(named(/^Ascending aorta$/)), arch = top(ves.aorte, 0.8);
const descLow = [O[0] + 2.2, -7.6, verts(ves.aorte).filter((p) => p[1] < -6).reduce((a, p) => a + p[2], 0) / Math.max(1, verts(ves.aorte).filter((p) => p[1] < -6).length)];
const descMid = meanOf(verts(ves.aorte).filter((p) => p[1] > 1 && p[1] < 3 && p[2] < -2.5));
const svcTop = meanOf(svc.filter((p) => p[1] > Math.max(...svc.map((q) => q[1])) - 0.8)), svcLowC = meanOf(svcLow);
const ivc = verts(ves['veine-cave-inferieure']); const ivcLow = meanOf(ivc.filter((p) => p[1] < -5.5 && p[1] > -6.5)), ivcTop = meanOf(ivc.filter((p) => p[1] > Math.max(...ivc.map((q) => q[1])) - 0.8));
const pv = verts(ves['veines-pulmonaires']); const pvR = meanOf(pv.filter((p) => p[0] < -2.5)), pvL = meanOf(pv.filter((p) => p[0] > 3.8));
const descTop = meanOf(verts(ves.aorte).filter((p) => p[1] > 6 && p[1] < 7 && p[2] < -2.5));
// le sang entre par la valve, descend vers la pointe puis remonte vers la chambre de chasse
const lerp = (a, b, t) => v3.add(a, v3.mul(v3.sub(b, a), t));
const rvIn = v3.add(vd, v3.mul(AXIS, 0.8)), rvot = lerp(vd, pulmo, 0.6), lvot = lerp(lvLow, aortic, 0.55);
const rpaMid = cen(ves['artere-pulmonaire-droite']), lpaMid = cen(ves['artere-pulmonaire-gauche']);
const pvNear = (pt) => { const near = pv.filter((p) => v3.dist(p, pt) < 1.6); return near.length ? meanOf(near) : pt; };
const pvRin = pvNear(lerp(pvR, ogC, 0.55)), pvLin = pvNear(lerp(pvL, ogC, 0.55));
const flowPaths = [
  { color: 0x43589f, speed: 0.11, points: [svcTop, svcLowC, odC, lerp(odC, tricus, 0.6), tricus, rvIn, vd, rvot, pulmo, ptTop, lerp(ptTop, rpaMid, 0.5), rpaMid, rpaEnd] },
  { color: 0x43589f, speed: 0.11, points: [ivcLow, ivcTop, odC, lerp(odC, tricus, 0.6), tricus, rvIn, vd, rvot, pulmo, ptTop, lpaMid, lpaEnd] },
  { color: 0xc43a33, speed: 0.12, points: [pvR, pvRin, ogC, mitral, lvLow, lvot, aortic, asc, arch, descTop, descMid, descLow] },
  { color: 0xc43a33, speed: 0.12, points: [pvL, pvLin, ogC, mitral, lvLow, lvot, aortic, asc, arch, descTop, descMid, descLow] },
  { color: 0xc43a33, speed: 0.12, points: [aortic, asc, O, J, (() => { const t = top(named(/^Right common carotid artery$/), 0.6); return [t[0], Math.min(t[1], 13.3), t[2]]; })()] },
];
// ancres des étiquettes : point de la structure le mieux exposé vers l'extérieur (et un peu vers l'avant)
const HEART_C = meanOf([vg, vd, odC, ogC]);
// Règle : parmi les points tournés vers l'avant (vue antérieure de la planche), celui qui est au centre de la
// structure vue de face ; à défaut (structure postérieure), le point le plus exposé vers l'extérieur.
const anchorFrom = (pts, nrm) => {
  const front = pts.map((p, i) => i).filter((i) => nrm[i][2] > 0.35);
  if (front.length >= 12) {
    const c = meanOf(front.map((i) => pts[i]));
    const bi = front.reduce((b, i) => ((pts[i][0] - c[0]) ** 2 + (pts[i][1] - c[1]) ** 2 - 0.3 * pts[i][2] < (pts[b][0] - c[0]) ** 2 + (pts[b][1] - c[1]) ** 2 - 0.3 * pts[b][2] ? i : b), front[0]);
    return v3.add(pts[bi], v3.mul(nrm[bi], 0.03));
  }
  const cc = meanOf(pts), dir = v3.norm(v3.sub(cc, HEART_C));
  let bi = 0, bs = -1e9;
  pts.forEach((p, i) => { const sc = v3.dot(nrm[i], dir) - 0.25 * v3.dist(p, cc); if (sc > bs) { bs = sc; bi = i; } });
  return v3.add(pts[bi], v3.mul(nrm[bi], 0.03));
};
const meshNormals = (m) => vertexNormals({ verts: verts(m), tris: [...m.idx] });
const anchors = {};
ENV_IDS.forEach((id, s) => {
  const idx = []; env.attrs.forEach((a, i) => { if (a.sid === s) idx.push(i); });
  if (idx.length) anchors[id] = anchorFrom(idx.map((i) => env.verts[i]), idx.map((i) => env.normals[i]));
});
anchors['septum-interventriculaire'] = septum[2];
const TRONCS = { 'coronaire-droite': /^Trunk of right coronary artery$/, iva: /^Trunk of anterior interventricular branch of left coronary artery$/, 'sinus-coronaire': /^Coronary sinus$/ };
for (const role of ['coronaire', 'veine']) for (const [id, m] of Object.entries(raw[role])) { const mm = meshNormals(TRONCS[id] ? named(TRONCS[id]) : m); anchors[id] = anchorFrom(mm.verts, mm.normals); }
for (const [id, v] of Object.entries(VALVES)) anchors[id] = v3.add(v.center, v3.mul(v.axis, v.type === 'av' ? 0.6 : 0.5));
anchors['noeud-sinusal'] = SA_NODE; anchors['noeud-av'] = AV_NODE; anchors['faisceau-his'] = septum[1];
log('repères : septum', septum.length, 'niveaux ; nœud AV', AV_NODE.map((v) => v.toFixed(1)).join(','));

/* ─────────── 10. écriture ─────────── */
const R3 = (p) => p.map((v) => Math.round(v * 1000) / 1000);
const BB = { min: [-9.5, -9.5, -9.5], max: [9.5, 16, 9.5] };
const size = BB.max.map((v, k) => v - BB.min[k]);
const chunks = []; let offset = 0;
const push = (typed) => { const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength); const pad = (4 - (buf.length % 4)) % 4; const at = offset; chunks.push(buf, Buffer.alloc(pad)); offset += buf.length + pad; return [at, typed.length]; };
const quant = (vs) => { const q = new Uint16Array(vs.length * 3); vs.forEach((p, i) => { for (let k = 0; k < 3; k++) q[i * 3 + k] = Math.round(Math.min(1, Math.max(0, (p[k] - BB.min[k]) / size[k])) * 65535); }); return q; };
const qn = (ns) => { const a = new Int16Array(ns.length * 3); ns.forEach((n, i) => { for (let k = 0; k < 3; k++) a[i * 3 + k] = Math.round(n[k] * 32767); }); return a; };
const indices = (tris, nv) => (nv < 65536 ? new Uint16Array(tris) : new Uint32Array(tris));
const meshes = [];
const addMesh = (name, m, extra = {}) => {
  const e = { name, vcount: m.verts.length, pos: push(quant(m.verts)), nor: push(qn(m.normals)), idx: push(indices(m.tris, m.verts.length)), idx32: m.verts.length >= 65536, ...extra };
  meshes.push(e); return e;
};
{
  const col = new Uint8Array(env.verts.length * 4), tis = new Uint8Array(env.verts.length * 4);
  env.attrs.forEach((a, i) => { for (let k = 0; k < 3; k++) { col[i * 4 + k] = Math.round(a.col[k] * 255); tis[i * 4 + k] = Math.round(a.tis[k] * 255); } col[i * 4 + 3] = Math.round(a.ao * 255); tis[i * 4 + 3] = a.sid; });
  addMesh('enveloppe', env, { col: push(col), tis: push(tis) });
}
addMesh('proxy', proxy, { sid: push(new Uint8Array(proxy.sid)) });
{
  const col = new Uint8Array(cavities.verts.length * 4), tis = new Uint8Array(cavities.verts.length * 4);
  cavities.col.forEach((c, i) => { for (let k = 0; k < 4; k++) col[i * 4 + k] = Math.round(c[k] * 255); tis[i * 4 + 2] = ENV_IDS[cavities.sid[i]].startsWith('oreillette') ? 255 : 0; tis[i * 4 + 3] = cavities.sid[i]; });
  addMesh('cavites', cavities, { sid: push(new Uint8Array(cavities.sid)), col: push(col), tis: push(tis) });
}
addMesh('lumiere-artere', lumA); addMesh('lumiere-veine', lumV);
// pièces BodyParts3D affichées telles quelles (lissage léger, normales recalculées)
for (const [role, o] of Object.entries(raw)) for (const [id, m] of Object.entries(o)) {
  if (role === 'valve') continue;
  let mesh = { verts: verts(m), tris: [...m.idx] };
  if (role === 'pilier') mesh = subdivide(mesh);
  taubin(mesh, role === 'pilier' ? 6 : 3); vertexNormals(mesh);
  addMesh(`${role}:${id}`, mesh, { role, id });
}
// Carte 3D de la paroi (tranches de coupe) : pour chaque voxel de 2 mm autour du cœur, profondeur sous la surface
// externe (épicarde), distance à l'endocarde des cavités, et part de paroi vasculaire / auriculaire. Le shader des
// surfaces de coupe en tire l'orientation des fibres dans l'épaisseur, l'endocarde, l'épicarde et le type de tissu.
const VOL = (() => {
  const step = 0.2, min = [-6.6, -7.6, -6.6], max = [7.2, 7.2, 6.2];
  const n = [0, 1, 2].map((k) => Math.ceil((max[k] - min[k]) / step) + 1);
  const data = new Uint8Array(n[0] * n[1] * n[2] * 4);
  const q = (d) => Math.round(Math.min(2.55, Math.max(0, d)) * 100);
  for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
    const x = min[0] + i * step, y = min[1] + j * step, z = min[2] + k * step, o = ((k * n[1] + j) * n[0] + i) * 4;
    const f = field(x, y, z);
    if (f > 0.3) continue; // hors du cœur
    const c = core(x, y, z);
    let ves = 1e9; for (const id of Object.keys(PARTS)) ves = Math.min(ves, PARTS[id](x, y, z));
    const atr = Math.min(c.od, c.og), mus = Math.min(c.myo, atr);
    data[o] = q(-f); data[o + 1] = q(cavField(x, y, z));
    data[o + 2] = Math.round(255 / (1 + Math.exp((ves - mus) / 0.08))); // 255 : paroi de gros vaisseau
    data[o + 3] = Math.round(255 / (1 + Math.exp((atr - c.myo) / 0.08))); // 255 : paroi auriculaire
  }
  return { min, step, n, data };
})();
log('carte 3D de la paroi :', VOL.n.join(' × '), 'voxels');
const volEntry = { min: VOL.min, step: VOL.step, n: VOL.n, data: push(VOL.data) };
const header = {
  version: 2, volumes: { paroi: volEntry }, source: 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',
  ids: ENV_IDS, bounds: { min: BB.min, size }, meshes,
  frame: { base: R3(BASE), axis: R3(AXIS), u: R3(Uf), v: R3(Vf), apex: R3(APEX), cut4: R3(N4) },
  anchors: Object.fromEntries(Object.entries(anchors).map(([k, p]) => [k, R3(p)])),
  conduction: Object.fromEntries(Object.entries(conduction).map(([k, l]) => [k, l.map(R3)])),
  flowPaths: flowPaths.map((f) => ({ ...f, points: f.points.map(R3) })),
  valves: JSON.parse(JSON.stringify(VALVES, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v))),
};
const hb = Buffer.from(JSON.stringify(header), 'utf8'); const hpad = (4 - (hb.length % 4)) % 4;
const pre = Buffer.alloc(8); pre.write('HRT2', 0, 'ascii'); pre.writeUInt32LE(hb.length + hpad, 4);
const file = Buffer.concat([pre, hb, Buffer.alloc(hpad, 0x20), ...chunks]);
fs.writeFileSync(path.join(ROOT, 'assets', 'heart.bin'), file);
log(`assets/heart.bin : ${(file.length / 1048576).toFixed(2)} Mo, ${meshes.length} maillages`);
// Contrôle des épaisseurs : distance de chaque point des cavités ventriculaires à la surface externe (hors base)
for (const [nom, id, cible] of [['VG', 'ventricule-gauche', '8–12 mm'], ['VD', 'ventricule-droit', '3–5 mm']]) {
  const w = verts(cav[id]).filter((p) => v3.dot(v3.sub(p, BASE), AXIS) > 0.8).map((p) => -field(...p)).sort((a, b) => a - b);
  const q = (f) => w[Math.floor(f * (w.length - 1))].toFixed(2);
  log(`paroi ${nom} : 10 % ${q(0.1)}, médiane ${q(0.5)}, 90 % ${q(0.9)} cm (fiche patient : ${cible})`);
}
const tq = samples.map((s) => s[3]).sort((a, b) => a - b);
log(`épaisseur du myocarde aux coronaires : 10 % ${tq[Math.floor(tq.length * 0.1)].toFixed(2)}, médiane ${tMed.toFixed(2)}, 90 % ${tq[Math.floor(tq.length * 0.9)].toFixed(2)} cm`);
if (APERCU) fs.writeFileSync(APERCU, JSON.stringify({ env: { v: env.verts.flat().map((v) => +v.toFixed(3)), n: env.normals.flat().map((v) => +v.toFixed(3)), c: env.attrs.flatMap((a) => a.col.map((v) => +v.toFixed(3))), i: env.tris } }));
